/**
 * @gridstorm/analytix-monitor
 *
 * Sentinel — an autonomous streaming monitor. Feed it rows, it finds and
 * explains anomalies, filters by severity, posts to a webhook, and can enrich
 * explanations with an LLM.
 *
 *   import { Sentinel } from '@gridstorm/analytix-monitor';
 *   const sentinel = new Sentinel({ alertLevel: 'warning', webhookUrl, onFinding });
 *   await sentinel.push(newRows);   // → Finding[]
 */

export { Sentinel } from './sentinel.js';
export type {
  Finding,
  FindingType,
  MonitorConfig,
  Severity,
  ThresholdRule,
} from './sentinel.js';
