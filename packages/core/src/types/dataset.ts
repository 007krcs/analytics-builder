// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Dataset, Column, and Row types for Analytics Builder.
 * Represents the raw data layer that all engines operate on.
 */

/** Primitive value types supported in dataset cells */
export type CellValue = string | number | boolean | Date | null | undefined;

/** Data types for column schema inference and rendering */
export type ColumnType =
  | 'string'
  | 'number'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'currency'
  | 'percentage';

/** Aggregation functions applicable to numeric columns */
export type AggregationFunction =
  | 'sum'
  | 'avg'
  | 'count'
  | 'countDistinct'
  | 'min'
  | 'max'
  | 'median'
  | 'stdDev'
  | 'variance'
  | 'percentile'
  | 'first'
  | 'last';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Column metadata — describes a field in the dataset */
export interface Column {
  /** Unique identifier matching the key in Row objects */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** Inferred or explicitly set data type */
  type: ColumnType;
  /** Whether this column can be aggregated numerically */
  aggregatable: boolean;
  /** Whether this column can be used as a dimension (group-by axis) */
  dimensional: boolean;
  /** Optional format string (e.g., "0,0.00", "MM/DD/YYYY") */
  format?: string;
  /** Currency code for currency columns (e.g., "USD") */
  currency?: string;
  /** Minimum value observed (populated during schema inference) */
  minValue?: number;
  /** Maximum value observed (populated during schema inference) */
  maxValue?: number;
  /** Number of distinct values (populated during schema inference) */
  distinctCount?: number;
  /** Nullable flag */
  nullable: boolean;
}

/** A single row of data — keys are column IDs */
export type Row = Record<string, CellValue>;

/** Metadata about the dataset source */
export interface DataSourceInfo {
  id: string;
  name: string;
  type: 'inline' | 'csv' | 'json' | 'api' | 'gridstorm';
  url?: string;
  lastRefreshed?: Date;
  rowCount: number;
}

/** The core dataset object — schema + data + metadata */
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  columns: Column[];
  rows: Row[];
  source: DataSourceInfo;
  createdAt: Date;
  updatedAt: Date;
}

/** A filter applied to a dataset before aggregation */
export interface DataFilter {
  columnId: string;
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | 'in'
    | 'notIn'
    | 'isNull'
    | 'isNotNull'
    | 'between';
  value: CellValue | CellValue[];
}

/** Sort specification */
export interface SortSpec {
  columnId: string;
  direction: SortDirection;
}

/** Utility: infer column type from a sample value */
export function inferColumnType(value: CellValue): ColumnType {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'datetime';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'float';
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) return 'date';
    if (/^-?\d+(\.\d+)?$/.test(value)) return 'number';
  }
  return 'string';
}

/** Build a Dataset from plain row objects by inferring schema */
export function buildDataset(
  id: string,
  name: string,
  rows: Row[],
  sourceInfo?: Partial<DataSourceInfo>
): Dataset {
  const columnMap = new Map<string, Column>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!columnMap.has(key)) {
        const type = inferColumnType(value);
        columnMap.set(key, {
          id: key,
          displayName: key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          type,
          aggregatable: ['number', 'integer', 'float', 'currency', 'percentage'].includes(type),
          dimensional: ['string', 'boolean', 'date', 'datetime'].includes(type),
          nullable: true,
        });
      }
    }
  }

  const now = new Date();
  return {
    id,
    name,
    columns: Array.from(columnMap.values()),
    rows,
    source: {
      id: `src-${id}`,
      name,
      type: 'inline',
      rowCount: rows.length,
      ...sourceInfo,
    },
    createdAt: now,
    updatedAt: now,
  };
}
