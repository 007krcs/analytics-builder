/**
 * Types for the natural-language analytics layer.
 *
 * The whole design hinges on the LLM (or the offline heuristic) producing a
 * TYPED, validated `QueryPlan` — never free text. A plan is deterministic to
 * execute, safe to run locally, and trivial to render. This is what separates
 * a real feature from a chat toy.
 */

import type {
  AggregationFunction,
  ChartType,
  DataFilter,
  SortSpec,
} from '@gridstorm/analytix-core';

/** The high-level shape of an analytical question. */
export type AskIntent =
  | 'aggregate'   // one number: "total revenue"
  | 'breakdown'   // measure split by a dimension: "revenue by region"
  | 'trend'       // measure over a time dimension: "revenue by month"
  | 'top'         // ranked, descending, limited: "top 5 products by revenue"
  | 'bottom'      // ranked, ascending, limited: "worst 3 regions by margin"
  | 'share'       // proportion of a whole: "revenue share by category"
  | 'count';      // row counting: "how many orders in 2024"

/** A measure (what to compute) resolved from the question. */
export interface AskMeasure {
  /** Column id to aggregate, or '*' for COUNT(*). */
  columnId: string;
  aggregation: AggregationFunction;
  /** Human label, e.g. "Sum of Revenue". */
  label: string;
}

/**
 * A typed, executable analytical plan derived from a natural-language question.
 * Produced by `ask()` (offline) or, later, by an LLM tier — both emit this same
 * shape so the rest of the pipeline never changes.
 */
export interface QueryPlan {
  intent: AskIntent;
  /** What to measure. At least one entry. */
  measures: AskMeasure[];
  /** Column ids to group by (dimensions). */
  dimensions: string[];
  /** Pre-aggregation filters resolved from the question. */
  filters: DataFilter[];
  /** Sort applied to the result (usually on the first measure). */
  sort?: SortSpec;
  /** Row cap for top/bottom questions. */
  limit?: number;
  /** Suggested visualization. */
  chartType: ChartType;
  /** Plain-English restatement of how the question was interpreted. */
  explanation: string;
  /** 0–1 confidence that the interpretation is correct. */
  confidence: number;
  /** Question tokens that could not be mapped to the schema (for UI hints). */
  unresolved: string[];
  /** Which tier produced this plan. */
  source?: 'offline' | 'llm';
}

/** A computed answer: tabular rows plus the columns that describe them. */
export interface AskResult {
  /** Result rows — dimension values plus one key per measure label. */
  rows: Array<Record<string, string | number | null>>;
  /** Ordered column keys present in `rows` (dimensions first, then measures). */
  columns: string[];
  /** Number of source rows that passed the filters. */
  matchedRows: number;
}
