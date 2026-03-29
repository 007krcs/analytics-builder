/**
 * Line and Area chart data transformer.
 * Handles line, line-smooth, area, area-stacked.
 */

import type { Row, ChartConfig } from '@analytix/core';
import type { PreparedChartData, ChartDataPoint } from '../types.js';
import { resolveColors, calcDomain } from './helpers.js';

export function transformLine(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const yKeys = config.series.map((s) => s.label ?? s.columnId);
  const colorMap = resolveColors(config);

  const data: ChartDataPoint[] = rows.map((row) => {
    const point: ChartDataPoint = { [xKey]: row[xKey] as string | number };
    config.series.forEach((s) => {
      const key = s.label ?? s.columnId;
      const raw = row[s.columnId];
      point[key] = typeof raw === 'number' ? raw : null;
    });
    return point;
  });

  // For area-stacked, compute cumulative sums
  const stackedData =
    config.type === 'area-stacked'
      ? data.map((point) => {
          const stacked: ChartDataPoint = { [xKey]: point[xKey] };
          let cumulative = 0;
          yKeys.forEach((k) => {
            cumulative += Number(point[k]) || 0;
            stacked[k] = cumulative;
          });
          return stacked;
        })
      : data;

  const domain = calcDomain(stackedData, yKeys);

  return {
    data: stackedData,
    xKey,
    yKeys,
    colorMap,
    domain,
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}
