/**
 * Chart configuration and type definitions.
 * Supports 20+ chart types with full configuration schemas.
 */

import type { DataFilter, AggregationFunction } from './dataset.js';

/** All supported chart types */
export type ChartType =
  // Basic
  | 'bar'
  | 'bar-horizontal'
  | 'bar-stacked'
  | 'bar-stacked-100'
  | 'line'
  | 'line-smooth'
  | 'area'
  | 'area-stacked'
  // Circular
  | 'pie'
  | 'donut'
  | 'sunburst'
  // Scatter & statistical
  | 'scatter'
  | 'bubble'
  | 'histogram'
  | 'box-plot'
  | 'violin'
  // Heatmap & matrix
  | 'heatmap'
  | 'treemap'
  | 'calendar-heatmap'
  // Specialized
  | 'waterfall'
  | 'funnel'
  | 'gauge'
  | 'radar'
  | 'polar'
  | 'sankey'
  | 'combo';

/** Axis configuration */
export interface AxisConfig {
  label?: string;
  min?: number;
  max?: number;
  tickCount?: number;
  tickFormat?: string;
  gridLines?: boolean;
  logarithmic?: boolean;
}

/** Legend configuration */
export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right' | 'inside';
  align?: 'start' | 'center' | 'end';
}

/** Tooltip configuration */
export interface TooltipConfig {
  show: boolean;
  format?: string;
  includeTotal?: boolean;
  shared?: boolean;
}

/** Color palette options */
export type ColorPalette =
  | 'default'
  | 'pastel'
  | 'bold'
  | 'monochrome'
  | 'diverging'
  | 'sequential'
  | 'categorical';

/** Data series configuration */
export interface ChartSeries {
  id: string;
  /** Column ID from dataset or pivot result */
  columnId: string;
  label?: string;
  color?: string;
  /** For combo charts, override the chart type per series */
  type?: ChartType;
  /** Whether this series is on the secondary Y axis */
  yAxisSecondary?: boolean;
  /** Aggregation if this series needs pre-aggregation */
  aggregation?: AggregationFunction;
}

/** Full chart configuration */
export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  subtitle?: string;
  /** Dataset or pivot result ID */
  sourceId: string;
  sourceType: 'dataset' | 'pivot';
  /** X-axis column ID */
  xField: string;
  /** Y-axis series */
  series: ChartSeries[];
  /** Optional grouping field (for grouped charts) */
  groupField?: string;
  /** Size field for bubble charts */
  sizeField?: string;
  filters: DataFilter[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  y2Axis?: AxisConfig;
  legend: LegendConfig;
  tooltip: TooltipConfig;
  colorPalette: ColorPalette;
  /** Custom color overrides [index → hex] */
  colors?: string[];
  /** Chart dimensions */
  width?: number;
  height?: number;
  /** Whether the chart should auto-resize to container */
  responsive: boolean;
  /** Animation duration in ms (0 = disabled) */
  animationDuration: number;
  /** Show data labels on chart */
  showDataLabels: boolean;
  /** Show reference line */
  referenceLines?: ReferenceLine[];
}

/** Reference line for charts */
export interface ReferenceLine {
  id: string;
  axis: 'x' | 'y';
  value: number | string;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}

/** Chart type metadata for registry */
export interface ChartTypeMetadata {
  type: ChartType;
  label: string;
  description: string;
  category: ChartCategory;
  /** Minimum required series */
  minSeries: number;
  /** Maximum series (undefined = unlimited) */
  maxSeries?: number;
  /** Whether X-axis is required */
  requiresXField: boolean;
  /** Whether grouping is supported */
  supportsGrouping: boolean;
  /** Whether secondary Y axis is supported */
  supportsY2Axis: boolean;
  /** Icon name or emoji for UI */
  icon: string;
}

export type ChartCategory =
  | 'comparison'
  | 'distribution'
  | 'composition'
  | 'relationship'
  | 'trend'
  | 'part-of-whole'
  | 'flow'
  | 'geographic';

/** Default chart config factory */
export function createDefaultChartConfig(type: ChartType, sourceId: string): ChartConfig {
  return {
    id: `chart-${Date.now()}`,
    type,
    title: 'New Chart',
    sourceId,
    sourceType: 'dataset',
    xField: '',
    series: [],
    filters: [],
    legend: { show: true, position: 'bottom' },
    tooltip: { show: true, shared: true },
    colorPalette: 'default',
    responsive: true,
    animationDuration: 400,
    showDataLabels: false,
  };
}
