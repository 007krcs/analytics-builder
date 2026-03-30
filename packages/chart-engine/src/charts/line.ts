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

  // Aggregate (sum) all series values per unique xKey category
  const agg = new Map<string, ChartDataPoint>();
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    if (!agg.has(x)) {
      const point: ChartDataPoint = { [xKey]: x };
      config.series.forEach((s) => { point[s.label ?? s.columnId] = 0; });
      agg.set(x, point);
    }
    const entry = agg.get(x)!;
    config.series.forEach((s) => {
      const key = s.label ?? s.columnId;
      const raw = row[s.columnId];
      entry[key] = (Number(entry[key]) || 0) + (typeof raw === 'number' ? raw : (parseFloat(String(raw)) || 0));
    });
  }

  let data: ChartDataPoint[] = Array.from(agg.values());

  // For area-stacked, compute cumulative sums
  if (config.type === 'area-stacked') {
    data = data.map((point) => {
      const stacked: ChartDataPoint = { [xKey]: point[xKey] };
      let cumulative = 0;
      yKeys.forEach((k) => {
        cumulative += Number(point[k]) || 0;
        stacked[k] = cumulative;
      });
      return stacked;
    });
  }

  const domain = calcDomain(data, yKeys);

  return {
    data,
    xKey,
    yKeys,
    colorMap,
    domain,
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}
