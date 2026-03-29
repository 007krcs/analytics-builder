/**
 * Pivot table configuration and result types.
 */

import type { AggregationFunction, DataFilter, SortSpec } from './dataset.js';

/** A single value field with its aggregation function */
export interface PivotValueField {
  columnId: string;
  aggregation: AggregationFunction;
  /** Display label override */
  label?: string;
  /** Percentile target (0-100), required when aggregation === 'percentile' */
  percentile?: number;
  /** Number formatting */
  format?: string;
}

/** Configuration for a pivot table computation */
export interface PivotConfig {
  id: string;
  /** Dataset ID to operate on */
  datasetId: string;
  /** Column IDs used as row dimensions */
  rowFields: string[];
  /** Column IDs used as column dimensions */
  columnFields: string[];
  /** Value fields with aggregation functions */
  valueFields: PivotValueField[];
  /** Pre-aggregation filters */
  filters: DataFilter[];
  /** Sort applied to row keys */
  rowSort?: SortSpec;
  /** Sort applied to column keys */
  columnSort?: SortSpec;
  /** Whether to include grand totals row */
  showRowTotals: boolean;
  /** Whether to include grand totals column */
  showColumnTotals: boolean;
  /** Whether to include sub-totals per group */
  showSubTotals: boolean;
  /** Compact mode collapses single-dimension pivots */
  compactMode: boolean;
}

/** A single cell in the pivot result matrix */
export interface PivotCell {
  /** The aggregated numeric value */
  value: number | null;
  /** Formatted display string */
  formatted: string;
  /** Number of source rows contributing to this cell */
  count: number;
  /** Whether this cell is a total/subtotal */
  isTotal: boolean;
}

/** A row in the pivot result */
export interface PivotRow {
  /** Composite key from row dimension values */
  key: string;
  /** Individual dimension values, in order of rowFields */
  dimensions: Record<string, string>;
  /** Cells keyed by column key */
  cells: Record<string, PivotCell>;
  /** Depth in hierarchy (for tree-style display) */
  depth: number;
  /** Whether this is a subtotal row */
  isSubtotal: boolean;
}

/** Column header in the pivot result */
export interface PivotColumnHeader {
  key: string;
  label: string;
  /** Dimension values that make up this column key */
  dimensions: Record<string, string>;
  /** Child headers for multi-level column dimensions */
  children?: PivotColumnHeader[];
  /** Which value field this column represents */
  valueField: string;
  depth: number;
  isTotal: boolean;
}

/** The full result of a pivot computation */
export interface PivotResult {
  configId: string;
  /** Column header tree */
  columnHeaders: PivotColumnHeader[];
  /** Flat list of columns in display order */
  flatColumns: PivotColumnHeader[];
  /** Data rows */
  rows: PivotRow[];
  /** Grand total row (if showRowTotals === true) */
  grandTotalRow?: PivotRow;
  /** Metadata */
  rowCount: number;
  columnCount: number;
  computedAt: Date;
  /** Duration of computation in ms */
  durationMs: number;
}
