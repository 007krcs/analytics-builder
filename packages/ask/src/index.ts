/**
 * @gridstorm/analytix-ask
 *
 * Natural-language analytics: ask a question in plain English, get a typed,
 * executable QueryPlan, run it locally, and read a one-line answer.
 *
 * Privacy-first by design: the offline engine here uses pure heuristics — no
 * network, no API key, no data egress. LLM tiers (local Ollama / BYO cloud key)
 * emit the same QueryPlan shape and plug in behind this same interface; they
 * only ever see the schema, never the rows.
 *
 *   import { ask, executePlan, summarize } from '@gridstorm/analytix-ask';
 *   const plan   = ask('top 5 products by revenue', dataset);
 *   const result = executePlan(plan, dataset);
 *   const answer = summarize(plan, result);   // "Widget A leads with 12,500 …"
 */

export { ask, executePlan, summarize } from './ask.js';
export type { AskOptions } from './ask.js';
export { planToPivotConfig, planToChartConfig } from './compile.js';
export type {
  AskIntent,
  AskMeasure,
  AskResult,
  QueryPlan,
} from './types.js';
