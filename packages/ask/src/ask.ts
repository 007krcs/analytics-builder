/**
 * Offline natural-language analytics engine.
 *
 * Turns a plain-English question + a dataset schema into a typed QueryPlan,
 * using pure heuristics — no LLM, no network, no API key. This is the always-on
 * tier; the LLM tiers (Ollama / BYO key) emit the same QueryPlan shape and slot
 * in behind the same interface.
 */

import type {
  AggregationFunction,
  CellValue,
  Column,
  Dataset,
  DataFilter,
  Row,
} from '@gridstorm/analytix-core';
import type { AskIntent, AskMeasure, AskResult, QueryPlan } from './types.js';

// ─── Keyword tables ───────────────────────────────────────────────────────────

const AGG_WORDS: Array<[RegExp, AggregationFunction]> = [
  [/\b(sum|total|combined|aggregate)\b/, 'sum'],
  [/\b(average|avg|mean)\b/, 'avg'],
  [/\b(median)\b/, 'median'],
  [/\b(distinct|unique|number of distinct)\b/, 'countDistinct'],
  [/\b(count|how many|number of|tally)\b/, 'count'],
  [/\b(maximum|max|highest value|largest value|peak)\b/, 'max'],
  [/\b(minimum|min|smallest value|lowest value)\b/, 'min'],
];

const TOP_WORDS = /\b(top|highest|best|largest|most|leading|biggest)\b/;
const BOTTOM_WORDS = /\b(bottom|lowest|worst|smallest|least|fewest)\b/;
const SHARE_WORDS = /\b(share|proportion|percentage|percent|split|breakdown of|distribution|composition|mix)\b/;
const TREND_WORDS = /\b(trend|over time|by (month|quarter|year|week|day)|monthly|quarterly|yearly|weekly|daily|timeline)\b/;
const GROUP_WORDS = /\b(by|per|for each|across|grouped by|broken down by|split by)\b/;

/** Very small synonym map: question word → extra column-name tokens to match. */
const SYNONYMS: Record<string, string[]> = {
  sales: ['revenue', 'amount', 'turnover'],
  revenue: ['sales', 'amount'],
  income: ['revenue', 'profit'],
  earnings: ['profit', 'income'],
  customers: ['customer', 'client', 'account'],
  orders: ['order', 'transaction', 'deal'],
  units: ['quantity', 'qty', 'volume'],
  cost: ['cost', 'spend', 'expense'],
};

// ─── Tokenisation + column resolution ─────────────────────────────────────────

function tokenize(q: string): string[] {
  return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

/** Significant tokens of a column name (camelCase + underscores → words ≥3 chars). */
function columnTokens(col: Column): string[] {
  const raw = `${col.displayName} ${col.id}`
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .toLowerCase();
  return Array.from(new Set(raw.split(/\s+/).filter((t) => t.length >= 3)));
}

/** Does the question reference this column (token overlap or synonyms)? */
function questionMentions(col: Column, qTokens: Set<string>): boolean {
  const tokens = columnTokens(col);
  for (const t of tokens) {
    if (qTokens.has(t)) return true;
    if (qTokens.has(t + 's') || (t.endsWith('s') && qTokens.has(t.slice(0, -1)))) return true;
    for (const syn of SYNONYMS[t] ?? []) if (qTokens.has(syn)) return true;
  }
  return false;
}

const isMeasureCol = (c: Column) =>
  c.aggregatable && ['number', 'integer', 'float', 'currency', 'percentage'].includes(c.type);
const isDimCol = (c: Column) => c.dimensional;
const isTimeCol = (c: Column) => ['date', 'datetime', 'time'].includes(c.type);

// ─── Value matching (for filters like "revenue in North America") ─────────────

/** Distinct values for a string dimension, capped, lowercased for matching. */
function distinctValues(rows: Row[], colId: string, cap = 500): Map<string, CellValue> {
  const out = new Map<string, CellValue>();
  for (const r of rows) {
    const v = r[colId];
    if (v == null) continue;
    const key = String(v).toLowerCase();
    if (!out.has(key)) out.set(key, v);
    if (out.size >= cap) break;
  }
  return out;
}

// ─── Main entry: ask() ────────────────────────────────────────────────────────

export interface AskOptions {
  /** Default row cap for top/bottom questions when no number is given (default 5). */
  defaultLimit?: number;
  /**
   * The previous question's plan, enabling follow-up refinements. When the new
   * question resolves no measure/dimension/aggregation of its own but DOES
   * resolve filters ("now just Europe", "only 2024"), the previous plan is
   * reused with the new filters merged in.
   */
  context?: QueryPlan;
}

export function ask(question: string, dataset: Dataset, options: AskOptions = {}): QueryPlan {
  const q = question.toLowerCase();
  const tokens = tokenize(question);
  const qTokens = new Set(tokens);
  const defaultLimit = options.defaultLimit ?? 5;

  const measureCols = dataset.columns.filter(isMeasureCol);
  const dimCols = dataset.columns.filter(isDimCol);

  const mentionedMeasures = measureCols.filter((c) => questionMentions(c, qTokens));
  const mentionedDims = dimCols.filter((c) => questionMentions(c, qTokens));
  const timeCols = dimCols.filter(isTimeCol);

  // ── Aggregation function ────────────────────────────────────────────────
  let aggregation: AggregationFunction = 'sum';
  let aggExplicit = false;
  for (const [re, fn] of AGG_WORDS) {
    if (re.test(q)) { aggregation = fn; aggExplicit = true; break; }
  }

  // ── Intent + structure flags ────────────────────────────────────────────
  const wantsTop = TOP_WORDS.test(q);
  const wantsBottom = BOTTOM_WORDS.test(q);
  const wantsShare = SHARE_WORDS.test(q);
  // "revenue 2023 vs 2024" — year-over-year comparison on the time column.
  const yearVsMatch = q.match(/\b((?:19|20)\d{2})\s*(?:vs\.?|versus)\s*((?:19|20)\d{2})\b/);
  const wantsTrend = TREND_WORDS.test(q) || (yearVsMatch != null && timeCols.length > 0);
  const wantsGroup = GROUP_WORDS.test(q) || mentionedDims.length > 0;
  const wantsCount = aggregation === 'count' || /\bhow many\b/.test(q);

  // ── Follow-up refinement ("now just Europe") ────────────────────────────
  // No measure, no dimension, no aggregation of its own — but filters DO
  // resolve: refine the previous plan instead of building a nonsense new one.
  if (
    options.context
    && mentionedMeasures.length === 0 && mentionedDims.length === 0
    && !aggExplicit && !wantsTop && !wantsBottom && !wantsShare && !wantsTrend && !wantsCount
  ) {
    const newFilters = resolveFilters(q, tokens, dataset, options.context.dimensions, false);
    if (newFilters.length > 0) {
      const ctx = options.context;
      // Replace any existing filter on the same column; keep the rest.
      const merged = [
        ...ctx.filters.filter((f) => !newFilters.some((nf) => nf.columnId === f.columnId)),
        ...newFilters,
      ];
      return {
        ...ctx,
        filters: merged,
        explanation: explain(ctx.intent, ctx.measures, ctx.dimensions, dataset, merged, ctx.limit, ctx.sort),
        confidence: Math.min(0.9, ctx.confidence),
        unresolved: [],
        source: 'offline',
      };
    }
  }

  // ── Pick measure(s) ─────────────────────────────────────────────────────
  const measures: AskMeasure[] = [];
  if (wantsCount && mentionedMeasures.length === 0) {
    measures.push({ columnId: '*', aggregation: 'count', label: 'Count' });
    aggregation = 'count';
  } else {
    const chosen = mentionedMeasures.length > 0 ? mentionedMeasures : measureCols.slice(0, 1);
    for (const c of chosen.slice(0, 2)) {
      // Currency/percentage default to sum; if user said "average", honour it.
      const agg: AggregationFunction = aggExplicit ? aggregation : 'sum';
      measures.push({ columnId: c.id, aggregation: agg, label: `${aggLabel(agg)} ${c.displayName}` });
    }
    if (measures.length === 0) {
      measures.push({ columnId: '*', aggregation: 'count', label: 'Count' });
      aggregation = 'count';
    }
  }

  // ── Pick dimension(s) ───────────────────────────────────────────────────
  let dimensions: string[] = [];
  if (wantsTrend && timeCols.length > 0) {
    const t = mentionedDims.find(isTimeCol) ?? timeCols[0];
    dimensions = [t.id];
  } else if (mentionedDims.length > 0) {
    dimensions = mentionedDims.slice(0, 2).map((c) => c.id);
  } else if (wantsGroup && dimCols.length > 0) {
    dimensions = [dimCols[0].id];
  }

  // ── Filters resolved from the question ──────────────────────────────────
  // For "2023 vs 2024" the single-year filter is suppressed and replaced by an
  // 'in' filter over both years, with the time axis bucketed by year.
  const filters = resolveFilters(q, tokens, dataset, dimensions, yearVsMatch != null);
  let timeGranularity: QueryPlan['timeGranularity'];
  if (yearVsMatch && timeCols.length > 0) {
    timeGranularity = 'year';
    filters.push({ columnId: (mentionedDims.find(isTimeCol) ?? timeCols[0]).id, operator: 'in', value: [yearVsMatch[1], yearVsMatch[2]] });
  }

  // ── Top / bottom limit + sort ───────────────────────────────────────────
  const limitMatch = q.match(/\b(?:top|bottom|first|last)\s+(\d{1,3})\b/) ?? q.match(/\b(\d{1,3})\s+(?:highest|lowest|best|worst)\b/);
  let limit: number | undefined;
  let sort: QueryPlan['sort'];
  const sortKey = measures[0]?.label;
  if ((wantsTop || wantsBottom) && dimensions.length > 0 && sortKey) {
    limit = limitMatch ? Math.min(parseInt(limitMatch[1], 10), 100) : defaultLimit;
    sort = { columnId: sortKey, direction: wantsBottom ? 'asc' : 'desc' };
  } else if (dimensions.length > 0 && sortKey && !wantsTrend) {
    // Default: sort breakdowns by the measure descending for readability.
    sort = { columnId: sortKey, direction: 'desc' };
  }

  // ── Intent ──────────────────────────────────────────────────────────────
  const intent: AskIntent =
    wantsTrend && dimensions.some((d) => isTimeCol(col(dataset, d))) ? 'trend'
    : wantsShare && dimensions.length > 0 ? 'share'
    : wantsBottom && dimensions.length > 0 ? 'bottom'
    : wantsTop && dimensions.length > 0 ? 'top'
    : wantsCount && dimensions.length === 0 ? 'count'
    : dimensions.length > 0 ? 'breakdown'
    : 'aggregate';

  // ── Chart suggestion ────────────────────────────────────────────────────
  // A two-bucket year comparison reads better as bars than a two-point line.
  const chartType = yearVsMatch ? 'bar' : suggestChart(intent, dimensions, dataset);

  // ── Confidence + unresolved tokens ──────────────────────────────────────
  const resolvedMeasure = mentionedMeasures.length > 0 || wantsCount;
  const resolvedDim = dimensions.length > 0;
  let confidence = 0.35;
  if (resolvedMeasure) confidence += 0.3;
  if (resolvedDim) confidence += 0.2;
  if (aggExplicit || wantsTop || wantsBottom || wantsTrend || wantsShare) confidence += 0.1;
  if (filters.length > 0) confidence += 0.05;
  confidence = Math.min(0.95, confidence);

  const recognised = new Set<string>([
    ...mentionedMeasures.flatMap(columnTokens),
    ...mentionedDims.flatMap(columnTokens),
  ]);
  const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'by', 'per', 'for', 'each', 'in', 'on', 'and',
    'me', 'show', 'what', 'is', 'are', 'how', 'many', 'much', 'give', 'across', 'with', 'to', 'top',
    'bottom', 'highest', 'lowest', 'best', 'worst', 'total', 'sum', 'average', 'avg', 'count', 'trend',
    'over', 'time', 'share', 'vs', 'versus', 'compare', 'group', 'grouped',
    // Generic question filler / entity words — these aren't columns, so they
    // should never surface in the "couldn't map" hint (esp. for count queries).
    'there', 'here', 'record', 'records', 'row', 'rows', 'entry', 'entries', 'data',
    'dataset', 'datasets', 'item', 'items', 'value', 'values', 'number', 'numbers',
    'do', 'does', 'did', 'we', 'i', 'my', 'our', 'us', 'you', 'your', 'have', 'has', 'had',
    'all', 'any', 'list', 'find', 'get', 'show', 'display', 'between', 'from', 'as', 'than',
    'then', 'them', 'this', 'that', 'these', 'those', 'about', 'into', 'out', 'was', 'were',
    'which', 'where', 'when', 'who', 'whom', 'and', 'or', 'not', 'most', 'least', 'more', 'less',
    // Refinement filler ("now just Europe", "only 2024")
    'now', 'just', 'only', 'instead', 'again']);
  const unresolved = tokens.filter(
    (t) => t.length >= 3 && !/^\d+$/.test(t) && !recognised.has(t) && !STOPWORDS.has(t)
  );

  return {
    intent, measures, dimensions, filters, sort, limit, chartType, timeGranularity,
    explanation: explain(intent, measures, dimensions, dataset, filters, limit, sort),
    confidence,
    unresolved,
    source: 'offline',
  };
}

/** Build a compact, privacy-safe schema description — column metadata and a
 *  few sample dimension values + measure ranges, but never the rows. */
export function buildSchemaCard(dataset: Dataset): string {
  const lines = dataset.columns.map((c) => {
    const role = isMeasureCol(c) ? 'measure' : isDimCol(c) ? 'dimension' : 'attribute';
    let extra = '';
    if (role === 'dimension' && c.type === 'string') {
      const vals = Array.from(distinctValues(dataset.rows, c.id, 8).values()).slice(0, 6);
      if (vals.length) extra = ` examples: ${vals.map((v) => JSON.stringify(String(v))).join(', ')}`;
    } else if (role === 'measure') {
      const nums = dataset.rows.map((r) => Number(r[c.id])).filter((n) => !Number.isNaN(n));
      if (nums.length) extra = ` range: ${Math.min(...nums)}..${Math.max(...nums)}`;
    }
    return `- ${c.id} "${c.displayName}" (${c.type}, ${role})${extra}`;
  });
  return lines.join('\n');
}

// ─── Filter resolution ────────────────────────────────────────────────────────

function resolveFilters(q: string, _tokens: string[], dataset: Dataset, dims: string[], skipYear: boolean): DataFilter[] {
  const filters: DataFilter[] = [];

  // 1. Numeric comparisons: "<col> over/above/greater than N", "under/below/less than N".
  for (const c of dataset.columns.filter(isMeasureCol)) {
    const name = c.displayName.toLowerCase();
    const gt = q.match(new RegExp(`${escape(name)}[^.]*?(?:over|above|greater than|more than|>)\\s*(\\d[\\d,.]*)`));
    const lt = q.match(new RegExp(`${escape(name)}[^.]*?(?:under|below|less than|fewer than|<)\\s*(\\d[\\d,.]*)`));
    if (gt) filters.push({ columnId: c.id, operator: 'gt', value: num(gt[1]) });
    if (lt) filters.push({ columnId: c.id, operator: 'lt', value: num(lt[1]) });
  }

  // 2. Year filter: "in 2024" against a date/time column. Skipped for
  //    "2023 vs 2024" questions, which build an 'in' filter over both years.
  const yearMatch = q.match(/\b(in|during|for)\s+(20\d{2}|19\d{2})\b/) ?? q.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch && !skipYear) {
    const year = yearMatch[yearMatch.length - 1];
    const timeCol = dataset.columns.find(isTimeCol);
    if (timeCol) filters.push({ columnId: timeCol.id, operator: 'contains', value: year });
  }

  // 3. Category value match: a distinct value of a string dimension appears in the
  //    question, e.g. "revenue in North America". Skip columns already used as a
  //    grouping dimension (you don't filter the axis you're breaking down by).
  for (const c of dataset.columns.filter((x) => isDimCol(x) && x.type === 'string')) {
    if (dims.includes(c.id)) continue;
    const values = distinctValues(dataset.rows, c.id);
    for (const [lower, original] of values) {
      if (lower.length >= 3 && q.includes(lower)) {
        filters.push({ columnId: c.id, operator: 'eq', value: original });
        break; // one value per column is enough
      }
    }
  }

  return filters;
}

// ─── Execution (self-contained — no engine dependency) ────────────────────────

export function executePlan(plan: QueryPlan, dataset: Dataset): AskResult {
  const filtered = applyFilters(dataset.rows, plan.filters);

  let rows: Array<Record<string, string | number | null>>;

  if (plan.dimensions.length === 0) {
    const row: Record<string, string | number | null> = {};
    for (const m of plan.measures) row[m.label] = aggregate(filtered, m);
    rows = [row];
  } else {
    const isTimeSeries = plan.intent === 'trend' || plan.timeGranularity != null;

    // ── Time bucketing ────────────────────────────────────────────────────
    // Trends group by calendar bucket (day/month/year), not raw date values:
    // a year of daily data becomes 12 month buckets, not 365 groups.
    let sourceRows: Row[] = filtered;
    if (isTimeSeries && plan.dimensions.length === 1) {
      const dim = plan.dimensions[0];
      const parsed = filtered.map((r) => ({ r, t: parseTime(r[dim]) }));
      const valid = parsed.filter((p) => p.t != null);
      // Only bucket when the column is actually parseable as time.
      if (valid.length > 0 && valid.length >= filtered.length / 2) {
        const gran = plan.timeGranularity ?? autoGranularity(valid.map((p) => p.t as number));
        sourceRows = valid.map(({ r, t }) => ({ ...r, [dim]: bucketLabel(t as number, gran) }));
      }
    }

    const groups = new Map<string, Row[]>();
    for (const r of sourceRows) {
      const key = plan.dimensions.map((d) => String(r[d] ?? '∅')).join(' ');
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
    }
    rows = Array.from(groups.values()).map((grp) => {
      const o: Record<string, string | number | null> = {};
      for (const d of plan.dimensions) o[label(dataset, d)] = toCell(grp[0][d]);
      for (const m of plan.measures) o[m.label] = aggregate(grp, m);
      return o;
    });

    if (isTimeSeries) {
      // Chronological order — bucket labels (YYYY / YYYY-MM / YYYY-MM-DD) and
      // ISO date strings both sort correctly as strings; other values at least
      // get a deterministic ascending order instead of insertion order.
      const dimLabel = label(dataset, plan.dimensions[0]);
      rows.sort((a, b) => String(a[dimLabel] ?? '').localeCompare(String(b[dimLabel] ?? '')));
    } else if (plan.sort) {
      // plan.sort.columnId holds the measure label to rank by.
      const key = plan.sort.columnId;
      const dir = plan.sort.direction === 'asc' ? 1 : -1;
      rows.sort((a, b) => (Number(a[key] ?? 0) - Number(b[key] ?? 0)) * dir);
    }
    if (plan.limit != null) rows = rows.slice(0, plan.limit);
  }

  const dimLabels = plan.dimensions.map((d) => label(dataset, d));
  const measureLabels = plan.measures.map((m) => m.label);
  return { rows, columns: [...dimLabels, ...measureLabels], matchedRows: filtered.length };
}

// ─── Answer narration ─────────────────────────────────────────────────────────

export function summarize(plan: QueryPlan, result: AskResult): string {
  const m = plan.measures[0];
  if (!m) return 'No measure could be determined.';
  if (result.rows.length === 0) return 'No rows match that question.';

  if (plan.dimensions.length === 0) {
    const v = result.rows[0][m.label];
    return `${m.label} is ${fmt(v)} across ${result.matchedRows.toLocaleString()} rows.`;
  }

  const dimKey = result.columns[0];
  const top = result.rows[0];
  const lead = `${top[dimKey]}` || '—';
  const leadVal = fmt(top[m.label]);

  if (plan.intent === 'bottom') {
    return `${lead} has the lowest ${stripAgg(m.label)} at ${leadVal} (of ${result.rows.length} shown).`;
  }
  if (plan.intent === 'trend') {
    const first = result.rows[0], last = result.rows[result.rows.length - 1];
    const a = Number(first[m.label] ?? 0), b = Number(last[m.label] ?? 0);
    const dir = b > a ? 'up' : b < a ? 'down' : 'flat';
    const pct = a !== 0 ? (((b - a) / Math.abs(a)) * 100).toFixed(1) : '—';
    return `${stripAgg(m.label)} trends ${dir} from ${fmt(first[m.label])} to ${fmt(last[m.label])} (${pct}%) over ${result.rows.length} periods.`;
  }
  const n = result.rows.length;
  return `${lead} leads with ${leadVal} in ${stripAgg(m.label)} (of ${n} ${pluralize(dimKey, n).toLowerCase()} shown).`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aggregate(rows: Row[], m: AskMeasure): number {
  if (m.aggregation === 'count') return rows.length;
  const nums: number[] = [];
  for (const r of rows) {
    const v = r[m.columnId];
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(/[,$]/g, '')) : NaN;
    if (!Number.isNaN(n)) nums.push(n);
  }
  if (m.aggregation === 'countDistinct') return new Set(rows.map((r) => r[m.columnId])).size;
  if (nums.length === 0) return 0;
  switch (m.aggregation) {
    case 'sum': return round(nums.reduce((a, b) => a + b, 0));
    case 'avg': return round(nums.reduce((a, b) => a + b, 0) / nums.length);
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    case 'median': {
      const s = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : round((s[mid - 1] + s[mid]) / 2);
    }
    default: return round(nums.reduce((a, b) => a + b, 0));
  }
}

function applyFilters(rows: Row[], filters: DataFilter[]): Row[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const v = row[f.columnId];
      switch (f.operator) {
        case 'eq': return String(v).toLowerCase() === String(f.value).toLowerCase();
        case 'neq': return v !== f.value;
        case 'gt': return typeof v === 'number' && v > Number(f.value);
        case 'gte': return typeof v === 'number' && v >= Number(f.value);
        case 'lt': return typeof v === 'number' && v < Number(f.value);
        case 'lte': return typeof v === 'number' && v <= Number(f.value);
        case 'contains': return String(v ?? '').toLowerCase().includes(String(f.value).toLowerCase());
        case 'in': {
          // Substring semantics per element — "2023" matches "2023-04-15".
          const arr = Array.isArray(f.value) ? f.value : [f.value];
          const s = String(v ?? '').toLowerCase();
          return arr.some((x) => s.includes(String(x).toLowerCase()));
        }
        default: return true;
      }
    })
  );
}

const col = (ds: Dataset, id: string): Column =>
  ds.columns.find((c) => c.id === id) ?? { id, displayName: id, type: 'string', aggregatable: false, dimensional: true, nullable: true };
const label = (ds: Dataset, id: string): string => col(ds, id).displayName;
const aggLabel = (a: AggregationFunction): string =>
  ({ sum: 'Total', avg: 'Average', count: 'Count', countDistinct: 'Distinct', min: 'Minimum', max: 'Maximum', median: 'Median' } as Record<string, string>)[a] ?? a;
const stripAgg = (s: string) => s.replace(/^(Total|Average|Count|Distinct|Minimum|Maximum|Median)\s+/, '');

function suggestChart(intent: AskIntent, dims: string[], ds: Dataset): QueryPlan['chartType'] {
  if (intent === 'trend') return 'line';
  if (intent === 'share') return 'pie';
  if (intent === 'aggregate' || intent === 'count') return 'gauge';
  if (dims.length > 0 && isTimeCol(col(ds, dims[0]))) return 'line';
  return 'bar';
}

function explain(
  _intent: AskIntent, measures: AskMeasure[], dims: string[], ds: Dataset,
  filters: DataFilter[], limit?: number, sort?: QueryPlan['sort']
): string {
  const m = measures.map((x) => x.label).join(' and ');
  let s = m;
  if (dims.length) s += ` by ${dims.map((d) => label(ds, d)).join(' and ')}`;
  if (sort && limit) s += `, ${sort.direction === 'asc' ? 'bottom' : 'top'} ${limit}`;
  else if (sort) s += `, sorted ${sort.direction === 'asc' ? 'ascending' : 'descending'}`;
  if (filters.length) {
    s += `, filtered to ${filters.map((f) => `${label(ds, f.columnId)} ${f.operator} ${f.value}`).join(' and ')}`;
  }
  return s;
}

/** English pluralise for the answer narration: Region→Regions, Category→Categories. */
const pluralize = (s: string, n: number): string =>
  n === 1 ? s
  : /[^aeiou]y$/i.test(s) ? s.replace(/y$/i, 'ies')
  : /(s|x|z|ch|sh)$/i.test(s) ? `${s}es`
  : /s$/i.test(s) ? s
  : `${s}s`;

// ── Time-bucketing helpers ────────────────────────────────────────────────────

/** Parse a cell as a point in time; null when it isn't one. */
function parseTime(v: CellValue): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v > 10_000_000 ? v : null; // epoch millis/seconds-ish only
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** Pick a bucket size from the data's span: ≤2 months → day, ≤3 years → month, else year. */
function autoGranularity(ts: number[]): 'day' | 'month' | 'year' {
  const days = (Math.max(...ts) - Math.min(...ts)) / 86_400_000;
  if (days > 1100) return 'year';
  if (days > 62) return 'month';
  return 'day';
}

function bucketLabel(t: number, g: 'day' | 'month' | 'year'): string {
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return g === 'year' ? String(y) : g === 'month' ? `${y}-${m}` : `${y}-${m}-${day}`;
}

const round = (n: number) => Math.round(n * 100) / 100;
const num = (s: string) => parseFloat(s.replace(/,/g, ''));
const toCell = (v: CellValue): string | number | null =>
  v == null ? null : typeof v === 'number' ? v : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function fmt(v: string | number | null | undefined): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Math.abs(v) >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(v);
  return String(v);
}
