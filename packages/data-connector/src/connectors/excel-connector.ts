// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Excel Connector — Read .xlsx / .xls / .ods files via SheetJS (xlsx).
 *
 * Features:
 *  - Reads any sheet by name or index (defaults to first sheet)
 *  - Auto-infers column types (number, date, string)
 *  - Returns same Dataset shape as CSV/REST connectors
 *
 * Requires the 'xlsx' package:
 *   pnpm add xlsx --filter @gridstorm/analytix-data-connector
 */

import type { Dataset, Row } from '@gridstorm/analytix-core';
import { buildDataset } from '@gridstorm/analytix-core';

export interface ExcelConnectorOptions {
  /** Sheet name or 0-based index. Defaults to 0 (first sheet). */
  sheet?: string | number;
  /** Name to assign the resulting dataset. Defaults to the sheet name. */
  datasetName?: string;
  /** Row index (0-based) to treat as headers. Defaults to 0. */
  headerRow?: number;
}

/**
 * Parse an Excel File object (from a file-input or drag-drop).
 *
 * @example
 * const dataset = await parseExcelFile(file);
 */
export async function parseExcelFile(
  file: File,
  options: ExcelConnectorOptions = {},
): Promise<Dataset> {
  const arrayBuffer = await file.arrayBuffer();
  return parseExcelBuffer(arrayBuffer, {
    datasetName: options.datasetName ?? file.name,
    ...options,
  });
}

/**
 * Parse raw Excel bytes (ArrayBuffer).
 * Useful when loading from fetch() or Node.js fs.readFile().
 */
export async function parseExcelBuffer(
  buffer: ArrayBuffer,
  options: ExcelConnectorOptions = {},
): Promise<Dataset> {
  // Dynamic import keeps xlsx out of the critical bundle path.
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });

  // Resolve sheet
  const sheetRef = options.sheet ?? 0;
  const sheetName =
    typeof sheetRef === 'string'
      ? sheetRef
      : workbook.SheetNames[sheetRef] ?? workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Excel file contains no sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook.`);
  }

  // Convert to array-of-arrays, then to array-of-objects using the header row
  const raw: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as unknown[][];

  if (raw.length < 2) {
    throw new Error('Excel sheet appears to be empty or has only a header row.');
  }

  const headerRow = options.headerRow ?? 0;
  const headers   = (raw[headerRow] as unknown[]).map((h, i) =>
    h != null ? String(h) : `col_${i}`,
  );
  const dataRows = raw.slice(headerRow + 1);

  // Normalise to Row[]
  const rows: Row[] = dataRows.map((row) => {
    const obj: Row = {};
    headers.forEach((h, i) => {
      const val = (row as unknown[])[i];
      // SheetJS returns Date objects when cellDates: true
      obj[h] = val instanceof Date ? val.toISOString() : (val as Row[string]);
    });
    return obj;
  });

  const datasetName = options.datasetName ?? sheetName;
  const datasetId   = datasetName.toLowerCase().replace(/\W+/g, '_');

  return buildDataset(datasetId, datasetName, rows, { type: 'csv' });
}
