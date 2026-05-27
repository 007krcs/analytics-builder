// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Google Sheets Connector
 *
 * Fetches public Google Sheets as CSV (no OAuth required).
 * Supports:
 *  - Full spreadsheet URL  (docs.google.com/spreadsheets/d/{id}/edit…)
 *  - Short share URL       (docs.google.com/spreadsheets/d/{id})
 *  - Named sheet/gid via URL fragment or explicit gid option
 */

import type { Dataset } from '@gridstorm/analytix-core';
import { parseCsvString } from './csv-connector.js';

export interface GoogleSheetsConnectorOptions {
  /** Override the sheet tab (gid). Defaults to first sheet (gid=0). */
  gid?: number;
  /** Name to assign the resulting dataset. Defaults to 'Google Sheet'. */
  datasetName?: string;
  /**
   * Optional CORS proxy prefix (e.g. 'https://corsproxy.io/?').
   * Required when running from localhost if the sheet fetch is blocked.
   */
  corsProxy?: string;
}

/** Extract the spreadsheet ID from any Google Sheets URL. */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

/** Extract the gid (sheet tab index) from a Google Sheets URL. */
export function extractGid(url: string): number | null {
  // ?gid=… or #gid=…
  const match = url.match(/[?#&]gid=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Build a CSV-export URL for a public Google Sheet. */
export function buildCsvExportUrl(
  sheetId: string,
  gid = 0,
  corsProxy = '',
): string {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  return corsProxy ? `${corsProxy}${encodeURIComponent(base)}` : base;
}

/**
 * Fetch a public Google Sheet and return a Dataset.
 *
 * @example
 * const ds = await fetchGoogleSheet(
 *   'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0'
 * );
 */
export async function fetchGoogleSheet(
  urlOrId: string,
  options: GoogleSheetsConnectorOptions = {},
): Promise<Dataset> {
  const sheetId = extractSheetId(urlOrId) ?? urlOrId; // fallback: treat as raw ID
  if (!sheetId) {
    throw new Error('Invalid Google Sheets URL — could not extract spreadsheet ID.');
  }

  const gid = options.gid ?? extractGid(urlOrId) ?? 0;
  const exportUrl = buildCsvExportUrl(sheetId, gid, options.corsProxy ?? '');

  let csvText: string;
  try {
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    csvText = await res.text();
  } catch (err) {
    throw new Error(
      `Failed to fetch Google Sheet: ${String(err)}. ` +
        'Make sure the sheet is shared publicly ("Anyone with the link can view").',
    );
  }

  return parseCsvString(csvText, {
    datasetName: options.datasetName ?? 'Google Sheet',
  });
}
