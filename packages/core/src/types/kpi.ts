// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * KPI configuration, result, and refresh policy types.
 */

import type { AggregationFunction, DataFilter } from './dataset.js';

/** How a KPI compares against its target/threshold */
export type ComparisonType =
  | 'greater_is_better'
  | 'lower_is_better'
  | 'target_hit'
  | 'range';

/** Status derived from threshold comparison */
export type KpiStatus = 'good' | 'warning' | 'critical' | 'neutral';

/** Threshold configuration for a KPI */
export interface KpiThreshold {
  /** Warning boundary value */
  warning: number;
  /** Critical boundary value */
  critical: number;
  /** Optional target (goal) value */
  target?: number;
  comparisonType: ComparisonType;
}

/** Trend direction */
export type TrendDirection = 'up' | 'down' | 'flat';

/** Period-over-period comparison configuration */
export interface PreviousPeriodConfig {
  /** Column containing date/time values */
  dateColumnId: string;
  /** How many periods back to compare */
  periodsBack: number;
  /** Period granularity */
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

/** Auto-refresh policy */
export interface RefreshPolicy {
  /** Whether auto-refresh is enabled */
  enabled: boolean;
  /** Refresh interval in seconds */
  intervalSeconds: number;
  /** Maximum number of auto-refreshes (undefined = infinite) */
  maxRefreshes?: number;
  /** Whether to pause refresh when tab is hidden */
  pauseWhenHidden: boolean;
}

/** Full KPI configuration */
export interface KpiConfig {
  id: string;
  title: string;
  description?: string;
  /** Dataset ID */
  datasetId: string;
  /** Column ID to aggregate */
  columnId: string;
  /** Aggregation function */
  aggregation: AggregationFunction;
  /** Percentile value (0-100) — required if aggregation === 'percentile' */
  percentile?: number;
  /** Pre-aggregation filters */
  filters: DataFilter[];
  /** Threshold configuration for status */
  threshold?: KpiThreshold;
  /** Period comparison for trend calculation */
  previousPeriod?: PreviousPeriodConfig;
  /** Display format string */
  format?: string;
  /** Unit suffix (e.g., "units", "$", "%") */
  unit?: string;
  /** Prefix symbol */
  prefix?: string;
  /** Number of decimal places */
  decimals: number;
  /** Auto-refresh policy */
  refreshPolicy: RefreshPolicy;
}

/** Trend calculation result */
export interface KpiTrend {
  direction: TrendDirection;
  /** Absolute change from previous period */
  absoluteChange: number;
  /** Percentage change from previous period */
  percentageChange: number;
  /** The previous period value */
  previousValue: number;
  /** Label for the comparison period */
  periodLabel: string;
}

/** Computed KPI result */
export interface KpiResult {
  configId: string;
  /** The computed value */
  value: number | null;
  /** Formatted display string */
  formatted: string;
  /** Derived status based on thresholds */
  status: KpiStatus;
  /** Trend vs previous period */
  trend?: KpiTrend;
  /** Raw count of rows aggregated */
  rowCount: number;
  computedAt: Date;
  durationMs: number;
  /** Whether this result is stale (refresh pending) */
  stale: boolean;
}

/** A KPI dashboard layout widget */
export interface KpiWidget {
  id: string;
  kpiConfigId: string;
  /** Grid position */
  gridRow: number;
  gridCol: number;
  /** Grid span */
  rowSpan: number;
  colSpan: number;
  /** Card size variant */
  size: 'small' | 'medium' | 'large';
  /** Visual style */
  variant: 'default' | 'compact' | 'sparkline' | 'progress';
}

/** A KPI dashboard */
export interface KpiDashboard {
  id: string;
  name: string;
  description?: string;
  /** Number of columns in the dashboard grid */
  columns: number;
  widgets: KpiWidget[];
  /** Dashboard-level refresh policy (overrides per-KPI if set) */
  refreshPolicy?: RefreshPolicy;
  createdAt: Date;
  updatedAt: Date;
}
