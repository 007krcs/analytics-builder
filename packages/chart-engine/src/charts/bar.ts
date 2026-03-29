/**
 * Bar chart data transformer.
 * Handles bar, bar-horizontal, bar-stacked, bar-stacked-100.
 */

import type { Row, ChartConfig } from '@analytix/core';
import type { PreparedChartData, ChartDataPoint } from '../types.js';
import { resolveColors, groupRowsByField } from './helpers.js';

export function transformBar(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const yKeys = config.series.map((s) => s.label ?? s.columnId);
  const colorMap = resolveColors(config);

  let data: ChartDataPoint[];

  if (config.groupField) {
    // Group mode: pivot rows by groupField into columns
    const grouped = groupRowsByField(rows, xKey, config.groupField, config.series[0]?.columnId);
    data = grouped.data;
  } else {
    // Simple mode: one column per series
    data = rows.map((row) => {
      const point: ChartDataPoint = { [xKey]: row[xKey] as string };
      config.series.forEach((s) => {
        const key = s.label ?? s.columnId;
        const raw = row[s.columnId];
        point[key] = typeof raw === 'number' ? raw : null;
      });
      return point;
    });
  }

  // For stacked-100, normalize each row to percentages
  if (config.type === 'bar-stacked-100') {
    data = data.map((point) => {
      const total = yKeys.reduce((sum, k) => sum + (Number(point[k]) || 0), 0);
      const normalized: ChartDataPoint = { [xKey]: point[xKey] };
      if (total > 0) {
        yKeys.forEach((k) => {
          normalized[k] = Math.round(((Number(point[k]) || 0) / total) * 100 * 10) / 10;
        });
      } else {
        yKeys.forEach((k) => { normalized[k] = 0; });
      }
      return normalized;
    });
  }

  return {
    data,
    xKey,
    yKeys,
    colorMap,
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}
