/**
 * DataTransformer — Normalize diverse inputs to Dataset format.
 */

import { buildDataset } from '@gridstorm/analytix-core';
import type { Dataset, Row, Column, ColumnType } from '@gridstorm/analytix-core';
import { inferSchema, coerceValue } from './schema-inferrer.js';

export interface TransformOptions {
  datasetId?: string;
  datasetName?: string;
  /** Override inferred types: key = column id, value = desired type */
  typeOverrides?: Record<string, ColumnType>;
}

/**
 * Transform an array of plain objects into a fully typed Dataset.
 * Infers schema from the first 100 rows and coerces all values.
 */
export function transformRows(rawRows: Record<string, unknown>[], options: TransformOptions = {}): Dataset {
  const id   = options.datasetId   ?? `ds-${Date.now()}`;
  const name = options.datasetName ?? 'Imported Dataset';

  if (rawRows.length === 0) {
    return buildDataset(id, name, []);
  }

  const inferredCols = inferSchema(rawRows as Row[]);

  // Apply type overrides
  const finalCols: Column[] = inferredCols.map((col) => {
    const override = options.typeOverrides?.[col.id];
    if (!override) return col;
    return {
      ...col,
      type:         override,
      aggregatable: ['number', 'integer', 'float', 'currency', 'percentage'].includes(override),
      dimensional:  ['string', 'boolean', 'date', 'datetime'].includes(override),
    };
  });

  // Coerce all rows
  const rows: Row[] = rawRows.map((raw) => {
    const row: Row = {};
    for (const col of finalCols) {
      row[col.id] = coerceValue(raw[col.id], col.type) as Row[string];
    }
    return row;
  });

  const now = new Date();
  return {
    id,
    name,
    columns:   finalCols,
    rows,
    source:    { id: `src-${id}`, name, type: 'csv', rowCount: rows.length },
    createdAt: now,
    updatedAt: now,
  };
}
