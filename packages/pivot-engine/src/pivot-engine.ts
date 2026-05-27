// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * PivotEngine — Real pivot table computation.
 *
 * Algorithm:
 * 1. Filter rows using DataFilter rules
 * 2. Group rows by (rowFields × columnFields) composite key
 * 3. For each group, compute all value field aggregations
 * 4. Construct PivotRow/PivotCell/PivotColumnHeader tree
 * 5. Optionally compute row and column grand totals
 */

import type {
  Dataset,
  PivotConfig,
  PivotResult,
  PivotRow,
  PivotCell,
  PivotColumnHeader,
  CellValue,
  DataFilter,
} from '@gridstorm/analytix-core';
import { aggregate, formatValue } from './aggregations.js';
import {
  GroupAccumulator,
  makeGroupKey,
  splitGroupKey,
  GROUP_KEY_DELIMITER,
  ValueBucket,
} from './types.js';

/**
 * Backwards-compat normalizer. Older docs (and the README example) used
 * `fieldId` instead of `columnId` on PivotValueField. Quietly accept either
 * so consumers copying the README don't get all-null cells.
 */
function normalizePivotConfig(config: PivotConfig): PivotConfig {
  let mutated = false;
  const valueFields = config.valueFields.map((vf) => {
    const legacy = vf as PivotConfig['valueFields'][number] & { fieldId?: string };
    if (!vf.columnId && legacy.fieldId) {
      mutated = true;
      return { ...vf, columnId: legacy.fieldId };
    }
    return vf;
  });
  return mutated ? { ...config, valueFields } : config;
}

export class PivotEngine {
  /** Compute a pivot table result from a dataset and config */
  compute(rawConfig: PivotConfig, dataset: Dataset): PivotResult {
    const config = normalizePivotConfig(rawConfig);
    const start = performance.now();

    // 1. Filter rows
    const filteredRows = applyFilters(dataset.rows, config.filters);

    // 2. Discover distinct column dimension values (for building column headers)
    const colDimValues = new Map<string, Set<string>>();
    for (const colField of config.columnFields) {
      colDimValues.set(colField, new Set());
    }

    // 3. Accumulate grouped data
    // Key: rowGroupKey + '|' + colGroupKey
    // Value: one ValueBucket per valueField
    const accumulator: GroupAccumulator = new Map();

    for (const row of filteredRows) {
      const rowKey = makeGroupKey(config.rowFields.map((f) => row[f]));
      const colKey = makeGroupKey(config.columnFields.map((f) => row[f]));

      // Track distinct column dim values
      config.columnFields.forEach((f, i) => {
        const v = row[f];
        colDimValues.get(f)!.add(v == null ? '__null__' : String(v));
        void i; // used implicitly via colKey
      });

      // For each value field, we create one bucket per (rowKey × colKey) combo
      config.valueFields.forEach((vf, vIdx) => {
        const compositeKey = `${rowKey}${GROUP_KEY_DELIMITER}${colKey}${GROUP_KEY_DELIMITER}${vIdx}`;
        if (!accumulator.has(compositeKey)) {
          accumulator.set(compositeKey, [{ values: [], count: 0, rawValues: [] }]);
        }
        const buckets = accumulator.get(compositeKey)!;
        const cellVal = row[vf.columnId];
        const num = toNumber(cellVal);
        if (num !== null) {
          buckets[0].values.push(num);
        }
        buckets[0].count++;
        buckets[0].rawValues.push(cellVal);
      });
    }

    // 4. Build distinct row group keys (in order of first appearance)
    const rowKeyOrder: string[] = [];
    const rowKeySet = new Set<string>();

    for (const row of filteredRows) {
      const rowKey = makeGroupKey(config.rowFields.map((f) => row[f]));
      if (!rowKeySet.has(rowKey)) {
        rowKeySet.add(rowKey);
        rowKeyOrder.push(rowKey);
      }
    }

    // 5. Build column headers
    const colGroupKeys = buildColGroupKeys(config.columnFields, colDimValues);
    const columnHeaders = buildColumnHeaders(config, colGroupKeys, colDimValues);
    const flatColumns = flattenColumnHeaders(columnHeaders);

    // Expand flatColumns for multi-value fields so cell keys match accumulator keys
    const expandedFlatColumns: PivotColumnHeader[] = config.valueFields.length > 1
      ? flatColumns.flatMap((col) =>
          config.valueFields.map((vf, vIdx) => ({
            ...col,
            key: `${col.key}__${vIdx}`,
            label: config.columnFields.length > 0
              ? `${col.label} / ${vf.label ?? vf.columnId}`
              : (vf.label ?? vf.columnId),
            valueField: vf.columnId,
          }))
        )
      : flatColumns;

    // 6. Build pivot rows
    const pivotRows: PivotRow[] = [];

    for (const rowKey of rowKeyOrder) {
      const rowDimensions = buildDimensionMap(config.rowFields, splitGroupKey(rowKey));
      const cells: Record<string, PivotCell> = {};

      for (const col of expandedFlatColumns) {
        // For multi-value fields, col.key is already "baseKey__vIdx"; extract vIdx from suffix.
        // For single-value fields, col.key is the plain column key and vIdx is always 0.
        let baseColKey: string;
        let vIdx: number;
        if (config.valueFields.length > 1) {
          const sepIdx = col.key.lastIndexOf('__');
          baseColKey = col.key.slice(0, sepIdx);
          vIdx = parseInt(col.key.slice(sepIdx + 2), 10);
        } else {
          baseColKey = col.key;
          vIdx = 0;
        }

        const compositeKey = `${rowKey}${GROUP_KEY_DELIMITER}${baseColKey}${GROUP_KEY_DELIMITER}${vIdx}`;
        const buckets = accumulator.get(compositeKey);
        const vf = config.valueFields[vIdx];
        const cellKey = col.key;

        if (!buckets || buckets[0].values.length === 0) {
          cells[cellKey] = {
            value: null,
            formatted: '—',
            count: 0,
            isTotal: false,
          };
        } else {
          const val = aggregate(buckets[0].values, vf.aggregation, {
            percentile: vf.percentile,
          });
          cells[cellKey] = {
            value: val,
            formatted: formatValue(val, vf.format),
            count: buckets[0].count,
            isTotal: false,
          };
        }
      }

      pivotRows.push({
        key: rowKey,
        dimensions: rowDimensions,
        cells,
        depth: 0,
        isSubtotal: false,
      });
    }

    // 7. Grand total row
    let grandTotalRow: PivotRow | undefined;
    if (config.showRowTotals) {
      grandTotalRow = computeGrandTotalRow(config, expandedFlatColumns, accumulator, rowKeyOrder);
    }

    const durationMs = performance.now() - start;

    return {
      configId: config.id,
      columnHeaders,
      flatColumns: expandedFlatColumns,
      rows: pivotRows,
      grandTotalRow,
      rowCount: pivotRows.length,
      columnCount: expandedFlatColumns.length,
      computedAt: new Date(),
      durationMs,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyFilters(rows: import('@gridstorm/analytix-core').Row[], filters: DataFilter[]): import('@gridstorm/analytix-core').Row[] {
  if (!filters.length) return rows;
  return rows.filter((row) =>
    filters.every((f) => {
      const val = row[f.columnId];
      switch (f.operator) {
        case 'eq': return val === f.value;
        case 'neq': return val !== f.value;
        case 'gt': return typeof val === 'number' && val > (f.value as number);
        case 'gte': return typeof val === 'number' && val >= (f.value as number);
        case 'lt': return typeof val === 'number' && val < (f.value as number);
        case 'lte': return typeof val === 'number' && val <= (f.value as number);
        case 'contains': return typeof val === 'string' && val.includes(f.value as string);
        case 'notContains': return typeof val === 'string' && !val.includes(f.value as string);
        case 'startsWith': return typeof val === 'string' && val.startsWith(f.value as string);
        case 'endsWith': return typeof val === 'string' && val.endsWith(f.value as string);
        case 'in': return Array.isArray(f.value) && f.value.includes(val as never);
        case 'notIn': return Array.isArray(f.value) && !f.value.includes(val as never);
        case 'isNull': return val == null;
        case 'isNotNull': return val != null;
        case 'between': {
          const [lo, hi] = f.value as [number, number];
          return typeof val === 'number' && val >= lo && val <= hi;
        }
        default: return true;
      }
    })
  );
}

function toNumber(val: CellValue): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[,$]/g, ''));
    return isNaN(n) ? null : n;
  }
  if (typeof val === 'boolean') return val ? 1 : 0;
  return null;
}

function buildColGroupKeys(
  columnFields: string[],
  colDimValues: Map<string, Set<string>>
): string[] {
  if (columnFields.length === 0) return ['__all__'];

  // Cartesian product of all column dimension values
  let keys: string[][] = [[]];
  for (const field of columnFields) {
    const values = Array.from(colDimValues.get(field) ?? []).sort();
    const newKeys: string[][] = [];
    for (const existing of keys) {
      for (const val of values) {
        newKeys.push([...existing, val]);
      }
    }
    keys = newKeys;
  }
  return keys.map((k) => k.join(GROUP_KEY_DELIMITER));
}

function buildColumnHeaders(
  config: PivotConfig,
  colGroupKeys: string[],
  _colDimValues: Map<string, Set<string>>
): PivotColumnHeader[] {
  return colGroupKeys.map((colKey) => {
    const dimValues = colKey === '__all__' ? {} : buildDimensionMap(config.columnFields, splitGroupKey(colKey));
    const label =
      colKey === '__all__'
        ? config.valueFields.map((vf) => vf.label ?? vf.columnId).join(' / ')
        : Object.values(dimValues).join(' › ');
    return {
      key: colKey,
      label,
      dimensions: dimValues,
      valueField: config.valueFields[0]?.columnId ?? '',
      depth: 0,
      isTotal: false,
    };
  });
}

function flattenColumnHeaders(headers: PivotColumnHeader[]): PivotColumnHeader[] {
  const flat: PivotColumnHeader[] = [];
  const recurse = (h: PivotColumnHeader) => {
    if (!h.children || h.children.length === 0) {
      flat.push(h);
    } else {
      for (const child of h.children) recurse(child);
    }
  };
  for (const h of headers) recurse(h);
  return flat;
}

function buildDimensionMap(fields: string[], values: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  fields.forEach((f, i) => {
    map[f] = values[i] ?? '';
  });
  return map;
}

function computeGrandTotalRow(
  config: PivotConfig,
  flatColumns: PivotColumnHeader[],
  accumulator: GroupAccumulator,
  rowKeys: string[]
): PivotRow {
  const cells: Record<string, PivotCell> = {};

  for (const col of flatColumns) {
    // flatColumns passed here is already expandedFlatColumns — each col has a unique key.
    // Extract baseColKey and vIdx the same way as the main pivot row loop.
    let baseColKey: string;
    let vIdx: number;
    if (config.valueFields.length > 1) {
      const sepIdx = col.key.lastIndexOf('__');
      baseColKey = col.key.slice(0, sepIdx);
      vIdx = parseInt(col.key.slice(sepIdx + 2), 10);
    } else {
      baseColKey = col.key;
      vIdx = 0;
    }

    const cellKey = col.key;
    const vf = config.valueFields[vIdx];

    // Collect all values for this column across all row keys
    const allValues: number[] = [];
    let totalCount = 0;
    for (const rowKey of rowKeys) {
      const compositeKey = `${rowKey}${GROUP_KEY_DELIMITER}${baseColKey}${GROUP_KEY_DELIMITER}${vIdx}`;
      const buckets: ValueBucket[] | undefined = accumulator.get(compositeKey);
      if (buckets) {
        allValues.push(...buckets[0].values);
        totalCount += buckets[0].count;
      }
    }

    const val = allValues.length > 0
      ? aggregate(allValues, vf.aggregation, { percentile: vf.percentile })
      : null;

    cells[cellKey] = {
      value: val,
      formatted: formatValue(val, vf.format),
      count: totalCount,
      isTotal: true,
    };
  }

  return {
    key: '__grand_total__',
    dimensions: {},
    cells,
    depth: 0,
    isSubtotal: false,
  };
}

/** Singleton instance */
export const pivotEngine = new PivotEngine();

/** Functional adapter for AnalyticsEngine.registerPivotEngine() */
export function computePivot(config: PivotConfig, dataset: Dataset): PivotResult {
  return pivotEngine.compute(config, dataset);
}
