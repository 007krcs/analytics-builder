/**
 * KpiEngine — Computes KPI values from a dataset with:
 * - All aggregation functions (via pivot-engine aggregations)
 * - Threshold status comparison
 * - Period-over-period trend calculation
 * - Formatted output
 */

import type {
  KpiConfig,
  KpiResult,
  KpiStatus,
  KpiTrend,
  TrendDirection,
  Dataset,
  Row,
  CellValue,
} from '@analytix/core';

/** Aggregation helper — computes sum/avg/count etc over an array of numbers */
function aggregateValues(
  values: number[],
  fn: KpiConfig['aggregation'],
  opts: { percentile?: number } = {}
): number | null {
  if (values.length === 0) return null;
  switch (fn) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count': return values.length;
    case 'countDistinct': return new Set(values).size;
    case 'min': return Math.min(...values);
    case 'max': return Math.max(...values);
    case 'median': {
      const s = [...values].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
    }
    case 'variance': {
      if (values.length < 2) return 0;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    }
    case 'stdDev': {
      if (values.length < 2) return 0;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
      return Math.sqrt(variance);
    }
    case 'percentile': {
      const p = opts.percentile ?? 90;
      const s = [...values].sort((a, b) => a - b);
      const idx = Math.ceil((p / 100) * s.length) - 1;
      return s[Math.max(0, Math.min(idx, s.length - 1))];
    }
    case 'first': return values[0];
    case 'last': return values[values.length - 1];
    default: return null;
  }
}

function toNumber(val: CellValue): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[$,]/g, ''));
    return isNaN(n) ? null : n;
  }
  if (typeof val === 'boolean') return val ? 1 : 0;
  return null;
}

/** Apply filters to rows */
function filterRows(rows: Row[], filters: KpiConfig['filters']): Row[] {
  if (!filters.length) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const val = row[f.columnId];
      switch (f.operator) {
        case 'eq': return val === f.value;
        case 'neq': return val !== f.value;
        case 'gt': return typeof val === 'number' && val > (f.value as number);
        case 'gte': return typeof val === 'number' && val >= (f.value as number);
        case 'lt': return typeof val === 'number' && val < (f.value as number);
        case 'lte': return typeof val === 'number' && val <= (f.value as number);
        case 'contains': return typeof val === 'string' && val.includes(f.value as string);
        case 'notContains': return typeof val === 'string' && !val.includes(f.value as string);
        case 'in': return Array.isArray(f.value) && f.value.includes(val as never);
        case 'notIn': return Array.isArray(f.value) && !f.value.includes(val as never);
        case 'isNull': return val == null;
        case 'isNotNull': return val != null;
        default: return true;
      }
    })
  );
}

/** Derive KPI status from threshold comparison */
function deriveStatus(
  value: number | null,
  threshold: KpiConfig['threshold']
): KpiStatus {
  if (value === null || !threshold) return 'neutral';

  const { warning, critical, target, comparisonType } = threshold;

  switch (comparisonType) {
    case 'greater_is_better':
      if (value >= (target ?? warning)) return 'good';
      if (value >= warning) return 'good';
      if (value >= critical) return 'warning';
      return 'critical';

    case 'lower_is_better':
      if (value <= (target ?? warning)) return 'good';
      if (value <= warning) return 'good';
      if (value <= critical) return 'warning';
      return 'critical';

    case 'target_hit':
      if (target !== undefined) {
        const pct = Math.abs((value - target) / target);
        if (pct <= 0.02) return 'good';
        if (pct <= 0.1) return 'warning';
        return 'critical';
      }
      return 'neutral';

    case 'range':
      if (value >= warning && value <= critical) return 'good';
      if (value >= warning * 0.9 && value <= critical * 1.1) return 'warning';
      return 'critical';

    default:
      return 'neutral';
  }
}

/** Format a numeric value according to KPI config */
function formatKpiValue(value: number | null, config: KpiConfig): string {
  if (value === null) return '—';

  const decimals = config.decimals;
  let formatted: string;

  if (config.format === 'currency') {
    formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } else if (config.format === 'percent') {
    formatted = `${(value * 100).toFixed(decimals)}`;
  } else if (config.format === 'compact') {
    if (Math.abs(value) >= 1e9) {
      formatted = `${(value / 1e9).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1e6) {
      formatted = `${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      formatted = `${(value / 1e3).toFixed(1)}K`;
    } else {
      formatted = value.toFixed(decimals);
    }
  } else {
    formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  return `${config.prefix ?? ''}${formatted}${config.unit ? ' ' + config.unit : ''}`;
}

/** Compute trend vs previous period */
function computeTrend(
  current: number,
  rows: Row[],
  config: KpiConfig
): KpiTrend | undefined {
  const pp = config.previousPeriod;
  if (!pp) return undefined;

  // Find the date range of current data
  const dateVals = rows
    .map((r) => r[pp.dateColumnId])
    .filter((v) => v != null)
    .map((v) => new Date(v as string | number))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dateVals.length === 0) return undefined;

  const latestDate = dateVals[dateVals.length - 1];

  // Calculate period offset in ms
  const periodMs = getPeriodMs(pp.granularity) * pp.periodsBack;
  const cutoffDate = new Date(latestDate.getTime() - periodMs);
  const prevCutoffDate = new Date(cutoffDate.getTime() - periodMs);

  // Filter rows for previous period
  const prevRows = rows.filter((r) => {
    const d = new Date(r[pp.dateColumnId] as string | number);
    return !isNaN(d.getTime()) && d >= prevCutoffDate && d < cutoffDate;
  });

  // Compute previous period value
  const prevValues = prevRows
    .map((r) => toNumber(r[config.columnId]))
    .filter((v): v is number => v !== null);

  const previousValue = aggregateValues(prevValues, config.aggregation, {
    percentile: config.percentile,
  });

  if (previousValue === null) return undefined;

  const absoluteChange = current - previousValue;
  const percentageChange =
    previousValue !== 0
      ? Math.round((absoluteChange / Math.abs(previousValue)) * 1000) / 10
      : 0;

  let direction: TrendDirection = 'flat';
  if (Math.abs(percentageChange) > 1) {
    direction = absoluteChange > 0 ? 'up' : 'down';
  }

  return {
    direction,
    absoluteChange,
    percentageChange,
    previousValue,
    periodLabel: `vs previous ${pp.periodsBack} ${pp.granularity}(s)`,
  };
}

function getPeriodMs(granularity: string): number {
  switch (granularity) {
    case 'day': return 86400000;
    case 'week': return 7 * 86400000;
    case 'month': return 30 * 86400000;
    case 'quarter': return 91 * 86400000;
    case 'year': return 365 * 86400000;
    default: return 86400000;
  }
}

/**
 * KpiEngine — computes a single KPI result from config + dataset.
 */
export class KpiEngine {
  compute(config: KpiConfig, dataset: Dataset): KpiResult {
    const start = performance.now();

    // Filter rows
    const rows = filterRows(dataset.rows, config.filters);

    // Extract numeric values for the configured column
    const values = rows
      .map((r) => toNumber(r[config.columnId]))
      .filter((v): v is number => v !== null);

    // Aggregate
    const value = aggregateValues(values, config.aggregation, {
      percentile: config.percentile,
    });

    // Format
    const formatted = formatKpiValue(value, config);

    // Status
    const status = deriveStatus(value, config.threshold);

    // Trend
    const trend =
      value !== null ? computeTrend(value, rows, config) : undefined;

    const durationMs = performance.now() - start;

    return {
      configId: config.id,
      value,
      formatted,
      status,
      trend,
      rowCount: rows.length,
      computedAt: new Date(),
      durationMs,
      stale: false,
    };
  }
}

export const kpiEngine = new KpiEngine();

/** Functional adapter for AnalyticsEngine.registerKpiEngine() */
export function computeKpi(config: KpiConfig, dataset: Dataset): KpiResult {
  return kpiEngine.compute(config, dataset);
}
