// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Heatmap and Calendar Heatmap data transformers.
 */

import type { Row, ChartConfig } from '@gridstorm/analytix-core';
import type { PreparedChartData, ChartDataPoint } from '../types.js';
import { toNum } from './helpers.js';

export function transformHeatmap(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const yKey = config.groupField ?? (config.series[0]?.columnId ?? 'y');
  const valueKey = config.series[0]?.columnId ?? 'value';
  const displayKey = config.series[0]?.label ?? valueKey;

  // Collect unique x and y values
  const xValues = new Set<string>();
  const yValues = new Set<string>();
  for (const row of rows) {
    xValues.add(String(row[xKey] ?? ''));
    yValues.add(String(row[yKey] ?? ''));
  }

  // Build matrix: for each (y, x) pair find the value
  const matrix = new Map<string, number>();
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    const y = String(row[yKey] ?? '');
    const v = toNum(row[valueKey]);
    const key = `${y}::${x}`;
    // Use max if duplicate keys
    matrix.set(key, Math.max(matrix.get(key) ?? 0, v));
  }

  // Flatten to array of {x, y, value} for rendering
  const data: ChartDataPoint[] = [];
  for (const y of Array.from(yValues).sort()) {
    for (const x of Array.from(xValues).sort()) {
      data.push({
        [xKey]: x,
        [yKey]: y,
        [displayKey]: matrix.get(`${y}::${x}`) ?? 0,
      });
    }
  }

  // Compute value range for color scaling
  const values = data.map((d) => Number(d[displayKey]) || 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  return {
    data,
    xKey,
    yKeys: [displayKey],
    colorMap: {},
    domain: { min: minVal, max: maxVal },
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

export function transformCalendarHeatmap(rows: Row[], config: ChartConfig): PreparedChartData {
  // For calendar heatmap, xField is date column, series[0] is the value
  const dateKey = config.xField;
  const valueKey = config.series[0]?.columnId ?? 'value';
  const displayKey = config.series[0]?.label ?? valueKey;

  const byDate = new Map<string, number>();
  for (const row of rows) {
    const dateStr = String(row[dateKey] ?? '').slice(0, 10); // YYYY-MM-DD
    const v = toNum(row[valueKey]);
    byDate.set(dateStr, (byDate.get(dateStr) ?? 0) + v);
  }

  const data: ChartDataPoint[] = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, [displayKey]: value }));

  const values = data.map((d) => Number(d[displayKey]) || 0);

  return {
    data,
    xKey: 'date',
    yKeys: [displayKey],
    colorMap: {},
    domain: { min: Math.min(...values), max: Math.max(...values) },
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}
