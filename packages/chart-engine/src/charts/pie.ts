/**
 * Pie, Donut, and Sunburst chart data transformers.
 */

import type { Row, ChartConfig } from '@gridstorm/analytix-core';
import type { PreparedChartData, ChartDataPoint } from '../types.js';
import { resolveColors, toNum } from './helpers.js';

export function transformPie(rows: Row[], config: ChartConfig): PreparedChartData {
  const nameKey = config.xField;
  const valueKey = config.series[0]?.columnId ?? '';
  const displayKey = config.series[0]?.label ?? valueKey;
  const colorMap = resolveColors(config);

  // Aggregate by name
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = String(row[nameKey] ?? 'Unknown');
    const v = toNum(row[valueKey]);
    totals.set(name, (totals.get(name) ?? 0) + v);
  }

  const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  const data: ChartDataPoint[] = Array.from(totals.entries())
    .sort(([, a], [, b]) => b - a) // Sort by value desc
    .map(([name, value]) => ({
      name,
      [displayKey]: value,
      percentage: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    }));

  return {
    data,
    xKey: 'name',
    yKeys: [displayKey],
    colorMap,
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

export function transformSunburst(rows: Row[], config: ChartConfig): PreparedChartData {
  // Sunburst uses xField as outer dimension, groupField as inner dimension
  const outerKey = config.xField;
  const innerKey = config.groupField ?? outerKey;
  const valueKey = config.series[0]?.columnId ?? '';
  const displayKey = config.series[0]?.label ?? valueKey;

  // Build nested structure as flat {path, value}
  const nodeMap = new Map<string, number>();
  for (const row of rows) {
    const outer = String(row[outerKey] ?? 'Other');
    const inner = String(row[innerKey] ?? 'Other');
    const v = toNum(row[valueKey]);
    const path = outerKey === innerKey ? outer : `${outer}/${inner}`;
    nodeMap.set(path, (nodeMap.get(path) ?? 0) + v);
  }

  const data: ChartDataPoint[] = Array.from(nodeMap.entries()).map(([path, value]) => ({
    path,
    name: path.split('/').pop() ?? path,
    parent: path.includes('/') ? path.split('/')[0] : '',
    [displayKey]: value,
  }));

  return {
    data,
    xKey: 'path',
    yKeys: [displayKey],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}
