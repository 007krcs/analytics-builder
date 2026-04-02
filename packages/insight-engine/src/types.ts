/**
 * Types for the @gridstorm/analytix-insight-engine package.
 */

import type { Dataset, Row } from '@gridstorm/analytix-core';

/** All possible insight classification types */
export type InsightType =
  | 'trend-up'
  | 'trend-down'
  | 'trend-flat'
  | 'anomaly-spike'
  | 'anomaly-dip'
  | 'strong-correlation'
  | 'inverse-correlation'
  | 'top-segment'
  | 'bottom-segment'
  | 'segment-dominance'
  | 'forecast-growth'
  | 'forecast-decline'
  | 'missing-data'
  | 'data-quality'
  | 'record-high'
  | 'record-low'
  | 'period-over-period-change';

/** Insight severity levels */
export type InsightSeverity = 'info' | 'warning' | 'critical';

/** Trend strength labels */
export type TrendStrength = 'weak' | 'moderate' | 'strong';

/** Chart types that may be recommended */
export type ChartSuggestion =
  | 'line'
  | 'bar'
  | 'scatter'
  | 'pie'
  | 'area'
  | 'heatmap'
  | 'histogram';

/** A single detected insight */
export interface Insight {
  /** Unique ID for this insight instance */
  id: string;
  /** Classification type */
  type: InsightType;
  /** Short headline (< 12 words) */
  title: string;
  /** Plain-English description (1–2 sentences) */
  description: string;
  /** Severity classification */
  severity: InsightSeverity;
  /** Column IDs involved in this insight */
  affectedColumns: string[];
  /** 0–1 confidence score */
  confidence: number;
  /** Optional chart type suggestion */
  chartSuggestion?: ChartSuggestion;
  /** Additional numeric metadata for rendering (slopes, correlations, etc.) */
  metadata?: Record<string, number | string | Row[]>;
}

/** Configuration for the InsightEngine.analyze() call */
export interface InsightConfig {
  /** Which detectors to run (default: all) */
  detectors?: Array<
    'trend' | 'anomaly' | 'correlation' | 'segment' | 'forecast'
  >;
  /** Maximum number of insights to return (default: 20) */
  maxInsights?: number;
  /** Minimum confidence threshold 0–1 (default: 0.3) */
  minConfidence?: number;
  /** If provided, only analyse these column IDs */
  columnFilter?: string[];
}

/** Result of InsightEngine.analyze() */
export interface InsightResult {
  insights: Insight[];
  narrative: string;
  analyzedAt: Date;
  datasetId: string;
  rowCount: number;
  columnCount: number;
}

// Re-export Dataset for convenience
export type { Dataset };
