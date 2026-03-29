/**
 * @analytix/insight-engine
 *
 * Zero-dependency AI insights engine.
 * Auto-generates natural language insights from data patterns.
 * No API key needed — pure TypeScript statistics.
 */

export { InsightEngine, insightEngine } from './insight-engine.js';

export { detectTrends }       from './detectors/trend-detector.js';
export { detectAnomalies }    from './detectors/anomaly-detector.js';
export { detectCorrelations } from './detectors/correlation-detector.js';
export { detectSegments }     from './detectors/segment-detector.js';
export { detectForecasts }    from './detectors/forecast-detector.js';

export { generateNarrative, insightToSentence } from './generators/narrative-generator.js';

export type {
  InsightType,
  InsightSeverity,
  TrendStrength,
  ChartSuggestion,
  Insight,
  InsightConfig,
  InsightResult,
  Dataset,
} from './types.js';
