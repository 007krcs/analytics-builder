/**
 * Shared utilities for chart data transformers.
 */

import type { Row, ChartConfig, CellValue } from '@analytix/core';
import type { ChartDataPoint } from '../types.js';

/** Default color palette */
const DEFAULT_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6',
  '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#84cc16',
  '#06b6d4', '#8b5cf6', '#10b981', '#f43f5e', '#0ea5e9',
  '#d946ef', '#78716c', '#64748b', '#7c3aed', '#059669',
];

/** Build color map from config.series, falling back to default palette */
export function resolveColors(config: ChartConfig): Record<string, string> {
  const map: Record<string, string> = {};
  config.series.forEach((s, i) => {
    const key = s.label ?? s.columnId;
    map[key] = s.color ?? config.colors?.[i] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
  });
  return map;
}

/** Group rows by X field, pivoting a group dimension into columns */
export function groupRowsByField(
  rows: Row[],
  xField: string,
  groupField: string,
  valueField?: string
): { data: ChartDataPoint[]; groups: string[] } {
  const groups = new Set<string>();
  const xValues = new Map<string, ChartDataPoint>();

  for (const row of rows) {
    const xVal = String(row[xField] ?? '');
    const grpVal = String(row[groupField] ?? '');
    groups.add(grpVal);

    if (!xValues.has(xVal)) {
      xValues.set(xVal, { [xField]: xVal });
    }
    const point = xValues.get(xVal)!;
    const rawVal: CellValue = valueField ? row[valueField] : null;
    point[grpVal] = typeof rawVal === 'number' ? rawVal : 0;
  }

  return {
    data: Array.from(xValues.values()),
    groups: Array.from(groups),
  };
}

/** Extract numeric value from a cell */
export function toNum(val: CellValue): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[,$]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  if (typeof val === 'boolean') return val ? 1 : 0;
  return 0;
}

/** Calculate min/max domain across all y-keys */
export function calcDomain(data: ChartDataPoint[], yKeys: string[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const point of data) {
    for (const key of yKeys) {
      const v = Number(point[key]);
      if (!isNaN(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
  };
}
