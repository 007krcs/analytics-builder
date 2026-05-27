// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * CSV Connector — RFC 4180 compliant CSV/TSV parser.
 *
 * Features:
 *  - Auto-detects delimiter (comma, tab, semicolon, pipe)
 *  - Handles quoted fields, embedded newlines, escaped quotes ("")
 *  - Infers column types via schema-inferrer
 *  - Detects header row automatically
 *  - Streams large files in 1000-row batches via async generator
 */

import type { Dataset } from '@gridstorm/analytix-core';
import { transformRows } from '../data-transformer.js';
import type { TransformOptions } from '../data-transformer.js';

// ── Delimiter detection ──────────────────────────────────────────────────────

const CANDIDATE_DELIMITERS = [',', '\t', ';', '|'];

function detectDelimiter(firstLine: string): string {
  let best: string = ',';
  let bestCount = 0;
  for (const delim of CANDIDATE_DELIMITERS) {
    const count = firstLine.split(delim).length - 1;
    if (count > bestCount) { bestCount = count; best = delim; }
  }
  return best;
}

// ── RFC 4180 record parser (state machine) ───────────────────────────────────
//
// Walks the entire CSV text character-by-character, tracking whether the
// scanner is currently inside a double-quoted field. Newlines (LF or CRLF)
// only terminate a record when not inside quotes. Doubled quotes "" inside
// a quoted field are emitted as a single `"`. Empty trailing lines are dropped.

/** Parse an entire CSV / TSV text into a row-of-fields matrix. RFC 4180-correct. */
export function parseCsvRecords(text: string, delim: string): string[][] {
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const n = text.length;

  for (let i = 0; i < n; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }   // escaped quote
        else { inQuotes = false; }                         // end of quoted run
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === delim) {
      row.push(field); field = '';
      continue;
    }
    if (c === '\r') {
      // accept CR or CRLF as record terminator
      row.push(field); field = '';
      rows.push(row); row = [];
      if (text[i + 1] === '\n') i++;
      continue;
    }
    if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
      continue;
    }
    field += c;
  }

  // Last record (no trailing newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop entirely-empty trailing rows (e.g. file ended with \n\n)
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }

  return rows;
}


// ── Header detection ─────────────────────────────────────────────────────────

function looksLikeHeader(fields: string[]): boolean {
  // A header row is likely all strings, no numeric-only fields
  return fields.every((f) => isNaN(Number(f.replace(/[$€£¥₹,%]/g, '').trim())) || f.trim() === '');
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface CsvParseOptions extends TransformOptions {
  /** Override delimiter auto-detection */
  delimiter?: string;
  /** If false, first row is data (not headers) */
  hasHeader?: boolean;
}

/** Detect the delimiter by counting candidates in the first ~4KB of `csv`. */
function detectDelimiterFromText(csv: string): string {
  const sample = csv.slice(0, 4096);
  // Use the first non-empty *logical* line, but inspect at most 1 KB before a newline
  let lineEnd = sample.indexOf('\n');
  if (lineEnd < 0) lineEnd = sample.length;
  return detectDelimiter(sample.slice(0, lineEnd));
}

/**
 * Parse a full CSV string into a Dataset. RFC 4180 compliant — handles quoted
 * newlines, escaped quotes (""), CRLF, and UTF-8 BOM.
 */
export function parseCsvString(csv: string, options: CsvParseOptions = {}): Dataset {
  if (csv.length === 0) return transformRows([], options);

  const delim = options.delimiter ?? detectDelimiterFromText(csv);
  const records = parseCsvRecords(csv, delim);
  if (records.length === 0) return transformRows([], options);

  const first  = records[0];
  const hasHdr = options.hasHeader ?? looksLikeHeader(first);

  const headers: string[] = hasHdr
    ? first.map((h, i) => h.trim() || `column_${i + 1}`)
    : first.map((_, i) => `column_${i + 1}`);

  const dataRecords = hasHdr ? records.slice(1) : records;
  const rawRows: Record<string, unknown>[] = dataRecords.map((fields) => {
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => { row[h] = fields[i] ?? null; });
    return row;
  });

  return transformRows(rawRows, options);
}

/**
 * Async generator that streams a large CSV string in 1000-row batches.
 * Yields partial Dataset objects with incrementally parsed rows.
 */
export async function* streamCsvString(
  csv: string,
  options: CsvParseOptions = {}
): AsyncGenerator<{ rows: Record<string, unknown>[]; batchIndex: number }> {
  if (csv.length === 0) return;

  const delim = options.delimiter ?? detectDelimiterFromText(csv);
  const records = parseCsvRecords(csv, delim);
  if (records.length === 0) return;

  const first  = records[0];
  const hasHdr = options.hasHeader ?? looksLikeHeader(first);

  const headers: string[] = hasHdr
    ? first.map((h, i) => h.trim() || `column_${i + 1}`)
    : first.map((_, i) => `column_${i + 1}`);

  const dataRecords = hasHdr ? records.slice(1) : records;
  const BATCH       = 1000;

  for (let start = 0; start < dataRecords.length; start += BATCH) {
    const batch = dataRecords.slice(start, start + BATCH);
    const rows  = batch.map((fields) => {
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => { row[h] = fields[i] ?? null; });
      return row;
    });
    yield { rows, batchIndex: Math.floor(start / BATCH) };
    await new Promise((r) => setTimeout(r, 0));
  }
}

/**
 * Parse a File object asynchronously (uses FileReader + streaming).
 */
export function parseCsvFile(file: File, options: CsvParseOptions = {}): Promise<Dataset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        resolve(parseCsvString(text, {
          ...options,
          datasetName: options.datasetName ?? file.name.replace(/\.[^.]+$/, ''),
        }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
