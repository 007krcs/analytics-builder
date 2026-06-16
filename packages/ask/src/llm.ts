/**
 * LLM tier for natural-language analytics.
 *
 * Sends ONLY the schema (column metadata, a few sample dimension values, and
 * measure ranges) to the configured LLM — never the rows — and asks it to
 * return a typed QueryPlan as JSON. The plan is validated against the dataset;
 * anything invalid is dropped, and if the result is unusable we fall back to
 * the offline heuristic engine. Same QueryPlan shape either way, so nothing
 * downstream changes.
 *
 * The request goes browser → your configured endpoint directly. The API key is
 * never logged and never sent anywhere except that endpoint.
 */

import type {
  AggregationFunction,
  ChartType,
  Column,
  Dataset,
  DataFilter,
} from '@gridstorm/analytix-core';
import { ask, buildSchemaCard } from './ask.js';
import type { AskMeasure, AskIntent, QueryPlan } from './types.js';

export type LlmProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

export interface LlmConfig {
  provider: LlmProvider;
  /** Model id. Falls back to a sensible provider default. */
  model?: string;
  /** API key (not needed for local Ollama). Never logged. */
  apiKey?: string;
  /** Override the request URL (required for 'custom'; optional elsewhere). */
  endpoint?: string;
  /** Per-request timeout in ms (default 20000). */
  timeoutMs?: number;
  /** Injectable fetch for testing. */
  fetchImpl?: typeof fetch;
}

const AGGREGATIONS = new Set<AggregationFunction>([
  'sum', 'avg', 'count', 'countDistinct', 'min', 'max', 'median', 'stdDev', 'variance', 'percentile', 'first', 'last',
]);

const CHART_TYPES = new Set<ChartType>([
  'bar', 'bar-horizontal', 'bar-stacked', 'bar-stacked-100', 'line', 'line-smooth', 'area', 'area-stacked',
  'pie', 'donut', 'sunburst', 'scatter', 'bubble', 'histogram', 'box-plot', 'violin', 'heatmap', 'treemap',
  'calendar-heatmap', 'waterfall', 'funnel', 'gauge', 'radar', 'polar', 'sankey', 'combo',
]);

const FILTER_OPS = new Set<DataFilter['operator']>([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'notContains', 'startsWith', 'endsWith',
  'in', 'notIn', 'isNull', 'isNotNull', 'between',
]);

const INTENTS = new Set<AskIntent>(['aggregate', 'breakdown', 'trend', 'top', 'bottom', 'share', 'count']);

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
  ollama: 'llama3.2',
  custom: 'gpt-4o-mini',
};

const SYSTEM_PROMPT = `You translate a natural-language analytics question into a JSON "query plan" for a given dataset schema.
Respond with ONLY a JSON object — no prose, no markdown fences.

Plan shape:
{
  "intent": "aggregate|breakdown|trend|top|bottom|share|count",
  "measures": [{ "columnId": string, "aggregation": "sum|avg|count|countDistinct|min|max|median", "label": string }],
  "dimensions": [string],
  "filters": [{ "columnId": string, "operator": "eq|neq|gt|gte|lt|lte|contains", "value": string|number }],
  "sort": { "columnId": <a measure label>, "direction": "asc|desc" },
  "limit": number,
  "chartType": "bar|line|area|pie|donut|scatter|gauge|radar|funnel|treemap|heatmap",
  "explanation": string,
  "confidence": number
}

Rules:
- Use ONLY columnIds that appear in the schema.
- measures must reference columns marked (measure); dimensions must reference columns marked (dimension).
- For counting rows, use a measure { "columnId": "*", "aggregation": "count", "label": "Count" }.
- sort.columnId must equal one of the measure labels you produced.
- Prefer "line" for time trends, "pie" for share/proportion, "bar" for breakdowns, "gauge" for a single number.
- Keep it minimal and faithful to the question.`;

// ─── Public entry ─────────────────────────────────────────────────────────────

/**
 * Produce a QueryPlan using the configured LLM, with the offline engine as a
 * guaranteed fallback. Never throws — always returns a usable plan.
 */
export async function askLLM(
  question: string,
  dataset: Dataset,
  config: LlmConfig
): Promise<QueryPlan> {
  try {
    const text = await callProvider(question, dataset, config);
    const raw = extractJson(text);
    const plan = validatePlan(raw, dataset, question);
    return plan;
  } catch {
    // Any failure (network, timeout, bad JSON, unusable plan) → offline tier.
    return ask(question, dataset);
  }
}

// ─── Provider transport ───────────────────────────────────────────────────────

async function callProvider(question: string, dataset: Dataset, config: LlmConfig): Promise<string> {
  const fetchImpl = config.fetchImpl ?? (globalThis as { fetch: typeof fetch }).fetch;
  if (!fetchImpl) throw new Error('No fetch available');
  const model = config.model || DEFAULT_MODELS[config.provider];
  const userPrompt = `Question: ${question}\n\nDataset columns:\n${buildSchemaCard(dataset)}`;

  const { url, init } = buildRequest(config, model, userPrompt);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), config.timeoutMs ?? 20_000);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const json = (await res.json()) as unknown;
    return extractContent(config.provider, json);
  } finally {
    clearTimeout(t);
  }
}

function buildRequest(config: LlmConfig, model: string, userPrompt: string): { url: string; init: RequestInit } {
  switch (config.provider) {
    case 'anthropic':
      return {
        url: config.endpoint || 'https://api.anthropic.com/v1/messages',
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': config.apiKey ?? '',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model, max_tokens: 1024, system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        },
      };
    case 'ollama':
      return {
        url: config.endpoint || 'http://localhost:11434/api/chat',
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model, stream: false, format: 'json', options: { temperature: 0 },
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
      };
    case 'openai':
    case 'custom':
    default:
      return {
        url: config.endpoint || 'https://api.openai.com/v1/chat/completions',
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiKey ?? ''}`,
          },
          body: JSON.stringify({
            model, temperature: 0, response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
          }),
        },
      };
  }
}

function extractContent(provider: LlmProvider, json: unknown): string {
  const j = json as Record<string, unknown>;
  if (provider === 'anthropic') {
    const content = j.content as Array<{ text?: string }> | undefined;
    return content?.[0]?.text ?? '';
  }
  if (provider === 'ollama') {
    const msg = j.message as { content?: string } | undefined;
    return msg?.content ?? '';
  }
  // OpenAI-compatible
  const choices = j.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? '';
}

// ─── Parsing + validation ─────────────────────────────────────────────────────

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  // Grab the outermost {...} if there's surrounding prose.
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(slice) as Record<string, unknown>;
}

/** Validate + repair a raw LLM object into a real QueryPlan, or throw to fall back. */
export function validatePlan(raw: Record<string, unknown>, dataset: Dataset, question: string): QueryPlan {
  const byId = new Map(dataset.columns.map((c) => [c.id, c]));
  const isMeasure = (c?: Column) => !!c && c.aggregatable;
  const isDim = (c?: Column) => !!c && c.dimensional;

  // Measures
  const rawMeasures = Array.isArray(raw.measures) ? raw.measures : [];
  const measures: AskMeasure[] = [];
  for (const m of rawMeasures as Array<Record<string, unknown>>) {
    const columnId = String(m.columnId ?? '');
    const aggregation = String(m.aggregation ?? 'sum') as AggregationFunction;
    if (!AGGREGATIONS.has(aggregation)) continue;
    if (columnId === '*') {
      measures.push({ columnId: '*', aggregation: 'count', label: String(m.label ?? 'Count') });
    } else if (isMeasure(byId.get(columnId))) {
      measures.push({ columnId, aggregation, label: String(m.label ?? `${aggregation} ${byId.get(columnId)!.displayName}`) });
    }
  }
  if (measures.length === 0) throw new Error('LLM plan has no valid measure');

  // Dimensions
  const rawDims = Array.isArray(raw.dimensions) ? raw.dimensions : [];
  const dimensions = (rawDims as unknown[])
    .map(String)
    .filter((d) => isDim(byId.get(d)));

  // Filters
  const rawFilters = Array.isArray(raw.filters) ? raw.filters : [];
  const filters: DataFilter[] = [];
  for (const f of rawFilters as Array<Record<string, unknown>>) {
    const columnId = String(f.columnId ?? '');
    const operator = String(f.operator ?? '') as DataFilter['operator'];
    if (byId.has(columnId) && FILTER_OPS.has(operator) && f.value !== undefined) {
      filters.push({ columnId, operator, value: f.value as DataFilter['value'] });
    }
  }

  // chartType
  let chartType = String((raw.chartType as string) ?? 'bar') as ChartType;
  if (!CHART_TYPES.has(chartType)) chartType = dimensions.length ? 'bar' : 'gauge';

  // intent
  let intent = String((raw.intent as string) ?? '') as AskIntent;
  if (!INTENTS.has(intent)) {
    intent = dimensions.length === 0 ? 'aggregate' : 'breakdown';
  }

  // sort + limit
  const measureLabels = new Set(measures.map((m) => m.label));
  let sort: QueryPlan['sort'];
  const rawSort = raw.sort as Record<string, unknown> | undefined;
  if (rawSort && measureLabels.has(String(rawSort.columnId))) {
    sort = {
      columnId: String(rawSort.columnId),
      direction: rawSort.direction === 'asc' ? 'asc' : 'desc',
    };
  } else if (dimensions.length > 0) {
    sort = { columnId: measures[0].label, direction: intent === 'bottom' ? 'asc' : 'desc' };
  }
  const limit = typeof raw.limit === 'number' && raw.limit > 0 ? Math.min(Math.floor(raw.limit), 100) : undefined;

  const explanation = typeof raw.explanation === 'string' && raw.explanation
    ? raw.explanation
    : `${measures.map((m) => m.label).join(', ')}${dimensions.length ? ' by ' + dimensions.join(', ') : ''}`;
  const confidence = typeof raw.confidence === 'number'
    ? Math.max(0, Math.min(1, raw.confidence))
    : 0.8;

  void question;
  return { intent, measures, dimensions, filters, sort, limit, chartType, explanation, confidence, unresolved: [], source: 'llm' };
}
