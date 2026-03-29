/**
 * Scatter and Bubble chart data transformer.
 */

import type { Row, ChartConfig } from '@analytix/core';
import type { PreparedChartData, ChartDataPoint } from '../types.js';
import { resolveColors, toNum } from './helpers.js';

export function transformScatter(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const yKeys = config.series.map((s) => s.label ?? s.columnId);
  const colorMap = resolveColors(config);

  // Scatter: each series produces {x, y} points; bubble adds {z} for size
  const data: ChartDataPoint[] = rows.map((row, idx) => {
    const point: ChartDataPoint = {
      index: idx,
      [xKey]: toNum(row[xKey]),
    };
    config.series.forEach((s) => {
      const key = s.label ?? s.columnId;
      point[key] = toNum(row[s.columnId]);
    });
    if (config.type === 'bubble' && config.sizeField) {
      point['__size__'] = toNum(row[config.sizeField]);
    }
    // Include label field for tooltip
    if (config.groupField) {
      point['__label__'] = String(row[config.groupField] ?? '');
    }
    return point;
  });

  return {
    data,
    xKey,
    yKeys,
    sizeKey: config.type === 'bubble' ? '__size__' : undefined,
    colorMap,
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}
