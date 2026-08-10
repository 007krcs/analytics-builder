import { describe, expect, it } from 'vitest';
import { buildDataset } from '@gridstorm/analytix-core';
import { ask, executePlan, summarize } from './ask.js';
import { planToChartConfig, planToPivotConfig } from './compile.js';

// Deterministic sales dataset.
// Region sums:   North America 600, Europe 100, Asia 400  (total 1100)
// Product sums:  Widget 450, Gadget 600, Gizmo 50
// Category sums: Hardware 1050, Software 50
const ds = buildDataset('sales', 'Sales', [
  { region: 'North America', product: 'Widget', category: 'Hardware', date: '2024-01-15', revenue: 100, units: 10, margin: 0.20 },
  { region: 'North America', product: 'Gadget', category: 'Hardware', date: '2024-02-10', revenue: 200, units: 20, margin: 0.30 },
  { region: 'North America', product: 'Widget', category: 'Hardware', date: '2024-03-05', revenue: 300, units: 30, margin: 0.25 },
  { region: 'Europe',        product: 'Gizmo',  category: 'Software', date: '2024-01-20', revenue: 50,  units: 5,  margin: 0.50 },
  { region: 'Europe',        product: 'Widget', category: 'Hardware', date: '2024-02-15', revenue: 50,  units: 5,  margin: 0.40 },
  { region: 'Asia',          product: 'Gadget', category: 'Hardware', date: '2024-03-12', revenue: 400, units: 40, margin: 0.35 },
]);

describe('ask() — plan construction', () => {
  it('"total revenue by region" → sum revenue, grouped by region, bar', () => {
    const p = ask('total revenue by region', ds);
    expect(p.intent).toBe('breakdown');
    expect(p.measures).toEqual([{ columnId: 'revenue', aggregation: 'sum', label: 'Total Revenue' }]);
    expect(p.dimensions).toEqual(['region']);
    expect(p.chartType).toBe('bar');
    expect(p.confidence).toBeGreaterThan(0.7);
  });

  it('"top 3 products by revenue" → top intent, limit 3, descending sort', () => {
    const p = ask('top 3 products by revenue', ds);
    expect(p.intent).toBe('top');
    expect(p.dimensions).toEqual(['product']);
    expect(p.limit).toBe(3);
    expect(p.sort).toEqual({ columnId: 'Total Revenue', direction: 'desc' });
  });

  it('"bottom 2 regions by revenue" → bottom intent, ascending, limit 2', () => {
    const p = ask('bottom 2 regions by revenue', ds);
    expect(p.intent).toBe('bottom');
    expect(p.limit).toBe(2);
    expect(p.sort?.direction).toBe('asc');
  });

  it('"average units per region" → avg aggregation', () => {
    const p = ask('average units per region', ds);
    expect(p.measures[0]).toMatchObject({ columnId: 'units', aggregation: 'avg' });
    expect(p.dimensions).toEqual(['region']);
  });

  it('"revenue over time" → trend intent + line chart on the date column', () => {
    const p = ask('revenue over time', ds);
    expect(p.intent).toBe('trend');
    expect(p.dimensions).toEqual(['date']);
    expect(p.chartType).toBe('line');
  });

  it('"revenue share by category" → share intent + pie chart', () => {
    const p = ask('revenue share by category', ds);
    expect(p.intent).toBe('share');
    expect(p.dimensions).toEqual(['category']);
    expect(p.chartType).toBe('pie');
  });

  it('"how many orders are there" → COUNT(*) with no dimension', () => {
    const p = ask('how many orders are there', ds);
    expect(p.intent).toBe('count');
    expect(p.measures[0]).toMatchObject({ columnId: '*', aggregation: 'count' });
    expect(p.dimensions).toEqual([]);
  });

  it('resolves a category-value filter: "revenue in north america"', () => {
    const p = ask('revenue in north america', ds);
    expect(p.filters).toEqual([{ columnId: 'region', operator: 'eq', value: 'North America' }]);
    expect(p.dimensions).toEqual([]); // region is a filter here, not an axis
  });

  it('resolves a numeric filter: "revenue over 150 by region"', () => {
    const p = ask('revenue over 150 by region', ds);
    expect(p.filters).toContainEqual({ columnId: 'revenue', operator: 'gt', value: 150 });
  });

  it('gives low confidence for an unrecognisable question', () => {
    const p = ask('asdf qwer zxcv', ds);
    expect(p.confidence).toBeLessThan(0.5);
    expect(p.unresolved.length).toBeGreaterThan(0);
  });
});

describe('executePlan() — computation', () => {
  it('computes and ranks a breakdown correctly', () => {
    const p = ask('total revenue by region', ds);
    const r = executePlan(p, ds);
    expect(r.matchedRows).toBe(6);
    expect(r.columns).toEqual(['Region', 'Total Revenue']);
    // Sorted descending by default → North America (600) leads.
    expect(r.rows[0]).toEqual({ Region: 'North America', 'Total Revenue': 600 });
    expect(r.rows.find((x) => x.Region === 'Europe')!['Total Revenue']).toBe(100);
  });

  it('applies top-N limit', () => {
    const p = ask('top 2 products by revenue', ds);
    const r = executePlan(p, ds);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]['Total Revenue']).toBe(600); // Gadget
  });

  it('applies a value filter then aggregates', () => {
    const p = ask('total revenue in north america', ds);
    const r = executePlan(p, ds);
    expect(r.matchedRows).toBe(3);
    expect(r.rows[0]['Total Revenue']).toBe(600);
  });

  it('averages correctly', () => {
    const p = ask('average units per region', ds);
    const r = executePlan(p, ds);
    expect(r.rows.find((x) => x.Region === 'North America')!['Average Units']).toBe(20);
    expect(r.rows.find((x) => x.Region === 'Asia')!['Average Units']).toBe(40);
  });

  it('counts rows for a COUNT(*) plan', () => {
    const p = ask('how many records', ds);
    const r = executePlan(p, ds);
    expect(r.rows[0].Count).toBe(6);
  });
});

describe('summarize() — narration', () => {
  it('narrates the leader of a breakdown', () => {
    const p = ask('total revenue by region', ds);
    const s = summarize(p, executePlan(p, ds));
    expect(s).toMatch(/North America leads with 600/);
  });

  it('narrates a single aggregate', () => {
    const p = ask('total revenue in north america', ds);
    const s = summarize(p, executePlan(p, ds));
    expect(s).toMatch(/Total Revenue is 600/);
  });

  it('narrates the laggard for a bottom query', () => {
    const p = ask('bottom 2 regions by revenue', ds);
    const s = summarize(p, executePlan(p, ds));
    expect(s).toMatch(/lowest/);
  });

  it('pluralises the dimension noun in the breakdown narration', () => {
    const p = ask('total revenue by region', ds);
    const s = summarize(p, executePlan(p, ds));
    // 3 regions → "of 3 regions shown", not "of 3 region shown".
    expect(s).toMatch(/of 3 regions shown/);
    expect(s).not.toMatch(/region shown/);
  });

  it('keeps the singular noun when only one group is shown', () => {
    const p = ask('top 1 product by revenue', ds);
    const s = summarize(p, executePlan(p, ds));
    expect(s).toMatch(/of 1 product shown/);
  });
});

describe('trend time-bucketing + chronological order', () => {
  // 8 months of SHUFFLED daily rows — the old code produced one group per raw
  // date in insertion order; bucketing must give ascending month buckets.
  const shuffled = buildDataset('ts', 'TS', [
    { day: '2024-06-10', revenue: 60 },
    { day: '2024-01-05', revenue: 10 },
    { day: '2024-08-20', revenue: 80 },
    { day: '2024-03-15', revenue: 30 },
    { day: '2024-01-25', revenue: 11 },
    { day: '2024-08-02', revenue: 81 },
    { day: '2024-03-01', revenue: 31 },
    { day: '2024-06-30', revenue: 61 },
  ]);

  it('buckets daily data by month and sorts chronologically', () => {
    const p = ask('revenue trend over time', shuffled);
    const r = executePlan(p, shuffled);
    const labels = r.rows.map((x) => x[r.columns[0]]);
    expect(labels).toEqual(['2024-01', '2024-03', '2024-06', '2024-08']);
    // Both January days aggregated into one bucket.
    expect(r.rows[0][r.columns[1]]).toBe(21);
  });

  it('short spans keep day buckets, still chronologically sorted', () => {
    const p = ask('revenue over time', ds); // ds spans Jan–Mar (≤62 days → day)
    const r = executePlan(p, ds);
    const labels = r.rows.map((x) => String(x[r.columns[0]]));
    const sorted = [...labels].sort();
    expect(labels).toEqual(sorted);
    expect(labels[0]).toBe('2024-01-15');
  });
});

describe('year-vs-year comparison', () => {
  const yoy = buildDataset('yoy', 'YoY', [
    { date: '2022-05-01', revenue: 5 },
    { date: '2023-02-01', revenue: 100 },
    { date: '2023-09-10', revenue: 150 },
    { date: '2024-03-03', revenue: 300 },
    { date: '2024-11-20', revenue: 100 },
  ]);

  it('"revenue 2023 vs 2024" → two year buckets, 2022 excluded, bar chart', () => {
    const p = ask('revenue 2023 vs 2024', yoy);
    expect(p.timeGranularity).toBe('year');
    expect(p.chartType).toBe('bar');
    expect(p.filters).toContainEqual({ columnId: 'date', operator: 'in', value: ['2023', '2024'] });
    const r = executePlan(p, yoy);
    expect(r.rows).toEqual([
      { [r.columns[0]]: '2023', [r.columns[1]]: 250 },
      { [r.columns[0]]: '2024', [r.columns[1]]: 400 },
    ]);
  });
});

describe('follow-up refinement via context', () => {
  it('"now just europe" reuses the previous plan with a region filter', () => {
    const p1 = ask('total revenue by product', ds);
    const p2 = ask('now just europe', ds, { context: p1 });
    expect(p2.dimensions).toEqual(['product']);
    expect(p2.measures).toEqual(p1.measures);
    expect(p2.filters).toContainEqual({ columnId: 'region', operator: 'eq', value: 'Europe' });
    const r = executePlan(p2, ds);
    expect(r.matchedRows).toBe(2); // only the two Europe rows
  });

  it('a refinement filter replaces an earlier filter on the same column', () => {
    const p1 = ask('total revenue by product in north america', ds);
    const p2 = ask('now just europe', ds, { context: p1 });
    const regionFilters = p2.filters.filter((f) => f.columnId === 'region');
    expect(regionFilters).toEqual([{ columnId: 'region', operator: 'eq', value: 'Europe' }]);
  });

  it('a standalone question ignores the context', () => {
    const p1 = ask('total revenue by product', ds);
    const p2 = ask('average units by region', ds, { context: p1 });
    expect(p2.dimensions).toEqual(['region']);
    expect(p2.measures[0]).toMatchObject({ columnId: 'units', aggregation: 'avg' });
  });
});

describe('unresolved tokens — no generic filler leaks into the hint', () => {
  it('"how many records are there" resolves cleanly (count query, no leftovers)', () => {
    const p = ask('how many records are there', ds);
    expect(p.intent).toBe('count');
    // "records" and "there" are filler, not columns — must NOT appear as unmapped.
    expect(p.unresolved).not.toContain('records');
    expect(p.unresolved).not.toContain('there');
    expect(p.unresolved).toEqual([]);
  });

  it('still flags a genuinely unknown column token', () => {
    const p = ask('total blorptspace by region', ds);
    expect(p.unresolved).toContain('blorptspace');
  });
});

describe('compile helpers', () => {
  it('planToPivotConfig maps dimensions and measures', () => {
    const cfg = planToPivotConfig(ask('total revenue by region', ds), 'sales');
    expect(cfg.rowFields).toEqual(['region']);
    expect(cfg.valueFields).toEqual([{ columnId: 'revenue', aggregation: 'sum', label: 'Total Revenue' }]);
  });

  it('planToChartConfig produces a renderable chart config', () => {
    const cfg = planToChartConfig(ask('total revenue by region', ds), 'sales');
    expect(cfg.type).toBe('bar');
    expect(cfg.xField).toBe('region');
    expect(cfg.series[0]).toMatchObject({ columnId: 'revenue', label: 'Total Revenue' });
  });
});
