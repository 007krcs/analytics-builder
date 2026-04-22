// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Chart engine internal types and data transformation contracts.
 */

import type { Row, ChartConfig, ChartType } from '@gridstorm/analytix-core';

/** The normalized data format passed to Recharts components */
export interface ChartDataPoint {
  [key: string]: string | number | boolean | null | undefined;
}

/** Configuration schema for a specific chart type */
export interface ChartTypeSchema {
  /** Required fields in ChartConfig for this chart type */
  requiredFields: (keyof ChartConfig)[];
  /** Minimum number of series */
  minSeries: number;
  /** Maximum series (undefined = unlimited) */
  maxSeries?: number;
  /** Whether X field is required */
  requiresXField: boolean;
  /** Recharts component name */
  rechartsComponent: string;
  /** Whether this chart type supports stacking */
  supportsStack: boolean;
  /** Whether this chart type uses a categorical X axis */
  categoricalX: boolean;
  /** Default chart height */
  defaultHeight: number;
  /** Data transformer function name */
  transformerKey: keyof typeof import('./charts/index.js');
}

/** Result of chart data preparation */
export interface PreparedChartData {
  data: ChartDataPoint[];
  xKey: string;
  yKeys: string[];
  /** For bubble: size key */
  sizeKey?: string;
  /** Color map: seriesId → hex */
  colorMap: Record<string, string>;
  /** For multi-level charts: domain info */
  domain?: { min: number; max: number };
  metadata: {
    rowCount: number;
    chartType: ChartType;
    preparedAt: Date;
  };
}

/** Transformer function signature */
export type DataTransformer = (
  rows: Row[],
  config: ChartConfig
) => PreparedChartData;
