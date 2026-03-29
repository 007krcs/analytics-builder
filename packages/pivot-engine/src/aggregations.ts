/**
 * Aggregation functions for pivot computation.
 * All functions operate on arrays of numbers and return a single numeric result.
 */

import type { AggregationFunction } from '@analytix/core';

/** Run an aggregation over a set of numeric values */
export function aggregate(
  values: number[],
  fn: AggregationFunction,
  options: { percentile?: number } = {}
): number | null {
  if (values.length === 0) return null;

  switch (fn) {
    case 'sum':
      return sum(values);
    case 'avg':
      return avg(values);
    case 'count':
      return values.length;
    case 'countDistinct':
      return countDistinct(values);
    case 'min':
      return min(values);
    case 'max':
      return max(values);
    case 'median':
      return median(values);
    case 'stdDev':
      return stdDev(values);
    case 'variance':
      return variance(values);
    case 'percentile':
      return percentile(values, options.percentile ?? 90);
    case 'first':
      return values[0];
    case 'last':
      return values[values.length - 1];
    default:
      throw new Error(`Unknown aggregation function: ${fn}`);
  }
}

/** Sum all values */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Arithmetic mean */
export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/** Count of distinct values */
export function countDistinct(values: number[]): number {
  return new Set(values).size;
}

/** Minimum value */
export function min(values: number[]): number {
  return Math.min(...values);
}

/** Maximum value */
export function max(values: number[]): number {
  return Math.max(...values);
}

/** Median — middle value of sorted array */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** Sample standard deviation (Bessel's correction) */
export function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

/** Sample variance (Bessel's correction: N-1 denominator) */
export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = avg(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return sum(squaredDiffs) / (values.length - 1);
}

/**
 * Percentile using the nearest-rank method.
 * @param p — percentile target, 0–100 (e.g., 90 for P90)
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p <= 0) return min(values);
  if (p >= 100) return max(values);

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

/** Format a numeric value with a given format string pattern */
export function formatValue(value: number | null, format?: string): string {
  if (value === null) return '—';
  if (!format) return String(value);

  // Handle common format patterns
  if (format === 'currency') return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
  if (format === 'integer') return Math.round(value).toLocaleString('en-US');
  if (format.includes(',')) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toFixed(2);
}
