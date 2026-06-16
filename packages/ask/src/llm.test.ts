import { describe, expect, it, vi } from 'vitest';
import { buildDataset } from '@gridstorm/analytix-core';
import { askLLM, buildSchemaCard, validatePlan } from './index.js';

const ds = buildDataset('sales', 'Sales', [
  { region: 'North America', product: 'Widget', revenue: 100, units: 10 },
  { region: 'Europe', product: 'Gizmo', revenue: 50, units: 5 },
  { region: 'Asia', product: 'Gadget', revenue: 400, units: 40 },
]);

function openAiResponse(plan: unknown): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(plan) } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

describe('buildSchemaCard — privacy', () => {
  it('includes column metadata but never the raw rows', () => {
    const card = buildSchemaCard(ds);
    expect(card).toContain('region');
    expect(card).toContain('revenue');
    expect(card).toContain('(integer, measure)');
    // Sample dimension values are allowed (low cardinality); measure RANGES, not each value.
    expect(card).toContain('North America');
    expect(card).toContain('range: 50..400');
  });
});

describe('askLLM — happy path', () => {
  it('parses a valid OpenAI plan into a typed QueryPlan (source=llm)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(openAiResponse({
      intent: 'breakdown',
      measures: [{ columnId: 'revenue', aggregation: 'sum', label: 'Total Revenue' }],
      dimensions: ['region'],
      filters: [],
      sort: { columnId: 'Total Revenue', direction: 'desc' },
      chartType: 'bar',
      explanation: 'Total Revenue by Region',
      confidence: 0.9,
    }));
    const plan = await askLLM('revenue by region', ds, { provider: 'openai', apiKey: 'sk-x', fetchImpl });
    expect(plan.source).toBe('llm');
    expect(plan.dimensions).toEqual(['region']);
    expect(plan.measures[0]).toMatchObject({ columnId: 'revenue', aggregation: 'sum' });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('sends the schema but NOT the row values to the endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(openAiResponse({
      intent: 'aggregate',
      measures: [{ columnId: 'revenue', aggregation: 'sum', label: 'Total Revenue' }],
      dimensions: [], filters: [], chartType: 'gauge', explanation: 'x', confidence: 0.8,
    }));
    await askLLM('total revenue', ds, { provider: 'openai', apiKey: 'sk-x', fetchImpl });
    const body = String((fetchImpl.mock.calls[0][1] as RequestInit).body);
    expect(body).toContain('revenue');          // schema present
    expect(body).not.toContain('"Widget"');     // a specific row value is NOT sent
  });

  it('uses Anthropic transport shape when provider=anthropic', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ content: [{ text: JSON.stringify({
        intent: 'aggregate', measures: [{ columnId: 'revenue', aggregation: 'sum', label: 'Total Revenue' }],
        dimensions: [], filters: [], chartType: 'gauge', explanation: 'x', confidence: 0.8,
      }) }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
    const plan = await askLLM('total revenue', ds, { provider: 'anthropic', apiKey: 'sk-ant', fetchImpl });
    expect(plan.source).toBe('llm');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('api.anthropic.com');
    expect((init as RequestInit).headers).toMatchObject({ 'x-api-key': 'sk-ant' });
  });
});

describe('askLLM — fallback', () => {
  it('falls back to the offline engine on HTTP error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    const plan = await askLLM('total revenue by region', ds, { provider: 'openai', apiKey: 'x', fetchImpl });
    expect(plan.source).toBe('offline');
    expect(plan.dimensions).toEqual(['region']);
  });

  it('falls back when the model returns non-JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(openAiResponse('not json at all') as Response);
    // openAiResponse stringifies; emulate raw text content instead:
    fetchImpl.mockResolvedValue(new Response(
      JSON.stringify({ choices: [{ message: { content: 'Sorry, I cannot do that.' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
    const plan = await askLLM('total revenue by region', ds, { provider: 'openai', apiKey: 'x', fetchImpl });
    expect(plan.source).toBe('offline');
  });

  it('falls back when the plan references unknown columns', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(openAiResponse({
      intent: 'breakdown',
      measures: [{ columnId: 'nonexistent', aggregation: 'sum', label: 'X' }],
      dimensions: ['alsofake'], filters: [], chartType: 'bar', explanation: 'x', confidence: 0.9,
    }));
    const plan = await askLLM('revenue by region', ds, { provider: 'openai', apiKey: 'x', fetchImpl });
    expect(plan.source).toBe('offline'); // no valid measure → threw → offline
  });
});

describe('validatePlan — repair', () => {
  it('drops invalid dimensions/filters but keeps valid measures', () => {
    const plan = validatePlan({
      intent: 'breakdown',
      measures: [
        { columnId: 'revenue', aggregation: 'sum', label: 'Total Revenue' },
        { columnId: 'ghost', aggregation: 'sum', label: 'Ghost' },
      ],
      dimensions: ['region', 'ghostdim'],
      filters: [{ columnId: 'region', operator: 'eq', value: 'Asia' }, { columnId: 'x', operator: 'eq', value: 1 }],
      chartType: 'banana',
      intentBogus: true,
    } as Record<string, unknown>, ds, 'q');
    expect(plan.measures).toHaveLength(1);
    expect(plan.dimensions).toEqual(['region']);
    expect(plan.filters).toEqual([{ columnId: 'region', operator: 'eq', value: 'Asia' }]);
    expect(plan.chartType).toBe('bar'); // unknown 'banana' repaired
    expect(plan.source).toBe('llm');
  });
});
