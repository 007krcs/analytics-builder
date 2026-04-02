/**
 * ChartRegistry — Maps every ChartType to its metadata and default config schema.
 * Used by UI components to render correct controls and validate configurations.
 */

import type { ChartType, ChartTypeMetadata, ChartConfig, Row, Dataset } from '@gridstorm/analytix-core';
import type { PreparedChartData } from './types.js';
import {
  transformBar,
  transformLine,
  transformScatter,
  transformHeatmap,
  transformCalendarHeatmap,
  transformPie,
  transformSunburst,
} from './charts/index.js';

// ─── Registry entries ─────────────────────────────────────────────────────────

export const CHART_REGISTRY: Record<ChartType, ChartTypeMetadata> = {
  bar: {
    type: 'bar',
    label: 'Bar Chart',
    description: 'Compare values across categories using vertical bars.',
    category: 'comparison',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '📊',
  },
  'bar-horizontal': {
    type: 'bar-horizontal',
    label: 'Horizontal Bar',
    description: 'Bar chart with horizontal orientation — ideal for long category names.',
    category: 'comparison',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '📊',
  },
  'bar-stacked': {
    type: 'bar-stacked',
    label: 'Stacked Bar',
    description: 'Show part-of-whole relationships across categories.',
    category: 'composition',
    minSeries: 2,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '📊',
  },
  'bar-stacked-100': {
    type: 'bar-stacked-100',
    label: '100% Stacked Bar',
    description: 'Proportional stacked bar showing percentage composition.',
    category: 'part-of-whole',
    minSeries: 2,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '📊',
  },
  line: {
    type: 'line',
    label: 'Line Chart',
    description: 'Show trends over time or continuous data.',
    category: 'trend',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: true,
    icon: '📈',
  },
  'line-smooth': {
    type: 'line-smooth',
    label: 'Smooth Line',
    description: 'Line chart with cubic bezier smoothing.',
    category: 'trend',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: true,
    icon: '📈',
  },
  area: {
    type: 'area',
    label: 'Area Chart',
    description: 'Line chart with filled area — emphasizes magnitude.',
    category: 'trend',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '📈',
  },
  'area-stacked': {
    type: 'area-stacked',
    label: 'Stacked Area',
    description: 'Multiple area series stacked to show cumulative totals.',
    category: 'composition',
    minSeries: 2,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '📈',
  },
  pie: {
    type: 'pie',
    label: 'Pie Chart',
    description: 'Show proportional composition of a whole.',
    category: 'part-of-whole',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '🥧',
  },
  donut: {
    type: 'donut',
    label: 'Donut Chart',
    description: 'Pie chart with a hollow center — good for KPI display.',
    category: 'part-of-whole',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '🍩',
  },
  sunburst: {
    type: 'sunburst',
    label: 'Sunburst',
    description: 'Hierarchical part-of-whole radial layout.',
    category: 'part-of-whole',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '☀️',
  },
  scatter: {
    type: 'scatter',
    label: 'Scatter Plot',
    description: 'Show correlation between two numeric variables.',
    category: 'relationship',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '⚡',
  },
  bubble: {
    type: 'bubble',
    label: 'Bubble Chart',
    description: 'Scatter plot with a third variable encoded as bubble size.',
    category: 'relationship',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '🫧',
  },
  histogram: {
    type: 'histogram',
    label: 'Histogram',
    description: 'Distribution of a single numeric variable in bins.',
    category: 'distribution',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '📉',
  },
  'box-plot': {
    type: 'box-plot',
    label: 'Box Plot',
    description: 'Show statistical distribution: median, quartiles, outliers.',
    category: 'distribution',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '📦',
  },
  violin: {
    type: 'violin',
    label: 'Violin Plot',
    description: 'Combines box plot with kernel density estimation.',
    category: 'distribution',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '🎻',
  },
  heatmap: {
    type: 'heatmap',
    label: 'Heatmap',
    description: 'Matrix of values encoded as color intensity.',
    category: 'relationship',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '🌡️',
  },
  treemap: {
    type: 'treemap',
    label: 'Treemap',
    description: 'Hierarchical data as nested rectangles sized by value.',
    category: 'part-of-whole',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '🗺️',
  },
  'calendar-heatmap': {
    type: 'calendar-heatmap',
    label: 'Calendar Heatmap',
    description: 'Daily value intensity laid out in a calendar grid.',
    category: 'trend',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '📅',
  },
  waterfall: {
    type: 'waterfall',
    label: 'Waterfall Chart',
    description: 'Cumulative effect of sequential positive/negative values.',
    category: 'comparison',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '🌊',
  },
  funnel: {
    type: 'funnel',
    label: 'Funnel Chart',
    description: 'Show stage-by-stage conversion rates.',
    category: 'flow',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '🔻',
  },
  gauge: {
    type: 'gauge',
    label: 'Gauge',
    description: 'Radial gauge for a single value against a target.',
    category: 'comparison',
    minSeries: 1,
    maxSeries: 1,
    requiresXField: false,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '⏱️',
  },
  radar: {
    type: 'radar',
    label: 'Radar Chart',
    description: 'Multivariate comparison on a radial axis grid.',
    category: 'comparison',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '🕸️',
  },
  polar: {
    type: 'polar',
    label: 'Polar Area',
    description: 'Radial area chart for cyclic or directional data.',
    category: 'comparison',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: false,
    icon: '🌐',
  },
  sankey: {
    type: 'sankey',
    label: 'Sankey Diagram',
    description: 'Flow diagram showing how values move between states.',
    category: 'flow',
    minSeries: 1,
    requiresXField: true,
    supportsGrouping: true,
    supportsY2Axis: false,
    icon: '🔀',
  },
  combo: {
    type: 'combo',
    label: 'Combo Chart',
    description: 'Mixed bar and line chart sharing the same X axis.',
    category: 'comparison',
    minSeries: 2,
    requiresXField: true,
    supportsGrouping: false,
    supportsY2Axis: true,
    icon: '🔢',
  },
};

/** Get metadata for a chart type */
export function getChartMeta(type: ChartType): ChartTypeMetadata {
  return CHART_REGISTRY[type];
}

/** Get all chart types grouped by category */
export function getChartsByCategory(): Record<string, ChartTypeMetadata[]> {
  const grouped: Record<string, ChartTypeMetadata[]> = {};
  for (const meta of Object.values(CHART_REGISTRY)) {
    if (!grouped[meta.category]) grouped[meta.category] = [];
    grouped[meta.category].push(meta);
  }
  return grouped;
}

// ─── Data transformation dispatch ────────────────────────────────────────────

/** Prepare chart data from raw dataset rows */
export function prepareChartData(
  config: ChartConfig,
  rows: Row[],
  _dataset: Dataset
): PreparedChartData {
  switch (config.type) {
    case 'bar':
    case 'bar-horizontal':
    case 'bar-stacked':
    case 'bar-stacked-100':
      return transformBar(rows, config);

    case 'line':
    case 'line-smooth':
    case 'area':
    case 'area-stacked':
      return transformLine(rows, config);

    case 'scatter':
    case 'bubble':
      return transformScatter(rows, config);

    case 'heatmap':
      return transformHeatmap(rows, config);

    case 'calendar-heatmap':
      return transformCalendarHeatmap(rows, config);

    case 'pie':
    case 'donut':
      return transformPie(rows, config);

    case 'sunburst':
      return transformSunburst(rows, config);

    // For complex chart types, fall back to bar transformation as base data
    case 'histogram':
      return transformHistogram(rows, config);

    case 'waterfall':
      return transformWaterfall(rows, config);

    case 'funnel':
      return transformFunnel(rows, config);

    case 'radar':
    case 'polar':
      return transformRadar(rows, config);

    case 'treemap':
      return transformTreemap(rows, config);

    case 'box-plot':
    case 'violin':
      return transformBoxPlot(rows, config);

    case 'gauge':
      return transformGauge(rows, config);

    case 'combo':
      return transformBar(rows, config);

    case 'sankey':
      return transformSankey(rows, config);

    default: {
      const exhaustive: never = config.type;
      throw new Error(`No data transformer for chart type: ${exhaustive}`);
    }
  }
}

// ─── Inline transformers for specialized charts ───────────────────────────────

function transformHistogram(rows: Row[], config: ChartConfig): PreparedChartData {
  const valueKey = config.xField;
  const values = rows.map((r) => Number(r[valueKey]) || 0).filter((v) => !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = config.series[0] ? 20 : 20;
  const binSize = (max - min) / binCount || 1;

  const bins = Array.from({ length: binCount }, (_, i) => ({
    bin: `${(min + i * binSize).toFixed(1)}–${(min + (i + 1) * binSize).toFixed(1)}`,
    count: 0,
    start: min + i * binSize,
    end: min + (i + 1) * binSize,
  }));

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binSize), binCount - 1);
    bins[idx].count++;
  }

  return {
    data: bins.map((b) => ({ x: b.bin, count: b.count })),
    xKey: 'x',
    yKeys: ['count'],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

function transformWaterfall(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const valueKey = config.series[0]?.columnId ?? '';
  const displayKey = config.series[0]?.label ?? valueKey;

  // Aggregate by xKey first
  const agg = new Map<string, number>();
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    agg.set(x, (agg.get(x) ?? 0) + (Number(row[valueKey]) || 0));
  }

  let cumulative = 0;
  const data = Array.from(agg.entries()).map(([x, value]) => {
    const start = cumulative;
    cumulative += value;
    return {
      [xKey]: x,
      [displayKey]: value,
      start,
      end: cumulative,
      isNegative: value < 0,
    };
  });

  return {
    data,
    xKey,
    yKeys: [displayKey],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

function transformFunnel(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const valueKey = config.series[0]?.columnId ?? '';
  const displayKey = config.series[0]?.label ?? valueKey;

  // Aggregate by xKey first, then sort descending
  const agg = new Map<string, number>();
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    agg.set(x, (agg.get(x) ?? 0) + (Number(row[valueKey]) || 0));
  }
  const sorted = Array.from(agg.entries()).sort((a, b) => b[1] - a[1]);
  const maxVal = sorted[0]?.[1] ?? 1;

  const data = sorted.map(([x, value], i) => ({
    stage: i + 1,
    [xKey]: x,
    [displayKey]: value,
    percentage: Math.round((value / maxVal) * 100),
  }));

  return {
    data,
    xKey,
    yKeys: [displayKey],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

function transformRadar(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const yKeys = config.series.map((s) => s.label ?? s.columnId);

  // Aggregate by xKey so each category becomes one radar spoke
  const agg = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const x = String(row[xKey] ?? '');
    if (!agg.has(x)) agg.set(x, {});
    const entry = agg.get(x)!;
    config.series.forEach((s) => {
      const key = s.label ?? s.columnId;
      entry[key] = (entry[key] ?? 0) + (Number(row[s.columnId]) || 0);
    });
  }

  const data = Array.from(agg.entries()).map(([x, vals]) => ({
    subject: x,
    ...vals,
  })) as Record<string, string | number | null | undefined>[];

  return {
    data,
    xKey: 'subject',
    yKeys,
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

function transformTreemap(rows: Row[], config: ChartConfig): PreparedChartData {
  const nameKey = config.xField;
  const valueKey = config.series[0]?.columnId ?? '';
  const displayKey = config.series[0]?.label ?? valueKey;

  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = String(row[nameKey] ?? 'Unknown');
    const v = Number(row[valueKey]) || 0;
    totals.set(name, (totals.get(name) ?? 0) + v);
  }

  const data = Array.from(totals.entries()).map(([name, value]) => ({
    name,
    [displayKey]: value,
  }));

  return {
    data,
    xKey: 'name',
    yKeys: [displayKey],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

function transformBoxPlot(rows: Row[], config: ChartConfig): PreparedChartData {
  const xKey = config.xField;
  const valueKey = config.series[0]?.columnId ?? '';

  // Group values by x category
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const cat = String(row[xKey] ?? '');
    const v = Number(row[valueKey]);
    if (!isNaN(v)) {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(v);
    }
  }

  const data = Array.from(groups.entries()).map(([category, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const q1 = sorted[Math.floor(n * 0.25)] ?? 0;
    const median = sorted[Math.floor(n * 0.5)] ?? 0;
    const q3 = sorted[Math.floor(n * 0.75)] ?? 0;
    const iqr = q3 - q1;
    return {
      [xKey]: category,
      min: sorted[0],
      q1,
      median,
      q3,
      max: sorted[n - 1],
      outlierLow: q1 - 1.5 * iqr,
      outlierHigh: q3 + 1.5 * iqr,
    };
  });

  return {
    data,
    xKey,
    yKeys: ['min', 'q1', 'median', 'q3', 'max'],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

function transformGauge(rows: Row[], config: ChartConfig): PreparedChartData {
  const valueKey = config.series[0]?.columnId ?? '';
  const total = rows.reduce((sum, r) => sum + (Number(r[valueKey]) || 0), 0);
  const avg = rows.length > 0 ? total / rows.length : 0;

  return {
    data: [{ value: avg, label: config.series[0]?.label ?? valueKey }],
    xKey: 'label',
    yKeys: ['value'],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}

function transformSankey(rows: Row[], config: ChartConfig): PreparedChartData {
  const sourceKey = config.xField;
  const targetKey = config.groupField ?? '';
  const valueKey = config.series[0]?.columnId ?? '';

  // Return empty if no target field configured
  if (!targetKey) {
    return {
      data: [],
      xKey: 'source',
      yKeys: ['value'],
      colorMap: {},
      metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
    };
  }

  const links: Record<string, number> = {};
  for (const row of rows) {
    const source = String(row[sourceKey] ?? '');
    const target = String(row[targetKey] ?? '');
    if (!source || !target || source === target) continue;
    const v = Number(row[valueKey]) || 1;
    const key = `${source}→${target}`;
    links[key] = (links[key] ?? 0) + v;
  }

  const data = Object.entries(links).map(([key, value]) => {
    const [source, target] = key.split('→');
    return { source, target, value };
  });

  return {
    data,
    xKey: 'source',
    yKeys: ['value'],
    colorMap: {},
    metadata: { rowCount: rows.length, chartType: config.type, preparedAt: new Date() },
  };
}
