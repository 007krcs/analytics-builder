/**
 * Clipboard Connector — Paste tab-separated data from Excel/Sheets.
 */

import type { Dataset } from '@analytix/core';
import { parseCsvString } from './csv-connector.js';
import type { CsvParseOptions } from './csv-connector.js';

export interface ClipboardConnectorOptions extends CsvParseOptions {
  datasetName?: string;
}

/**
 * Parse a clipboard paste event (tab-separated from Excel/Sheets).
 */
export function parseClipboardEvent(
  event: ClipboardEvent,
  options: ClipboardConnectorOptions = {}
): Dataset | null {
  const text = event.clipboardData?.getData('text/plain');
  if (!text) return null;
  return parseClipboardText(text, options);
}

/**
 * Parse raw tab-separated text (e.g., pasted from Excel).
 */
export function parseClipboardText(text: string, options: ClipboardConnectorOptions = {}): Dataset {
  return parseCsvString(text, {
    delimiter:   '\t',
    datasetName: options.datasetName ?? 'Pasted Data',
    ...options,
  });
}

/**
 * Read from the Clipboard API (requires user permission).
 */
export async function readFromClipboard(options: ClipboardConnectorOptions = {}): Promise<Dataset | null> {
  if (!navigator.clipboard?.readText) return null;
  try {
    const text = await navigator.clipboard.readText();
    if (!text.trim()) return null;
    return parseClipboardText(text, options);
  } catch {
    return null;
  }
}
