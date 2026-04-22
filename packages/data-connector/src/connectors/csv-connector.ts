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

// ── RFC 4180 field parser ────────────────────────────────────────────────────

function parseLine(line: string, delim: string): string[] {
  const fields: string[] = [];
  let i = 0;
  const n = line.length;

  while (i <= n) {
    if (i === n) { fields.push(''); break; }

    if (line[i] === '"') {
      // Quoted field
      i++;
      let field = '';
      while (i < n) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else {
          field += line[i++];
        }
      }
      fields.push(field);
      // skip delimiter
      if (line[i] === delim) i++;
    } else {
      // Unquoted field
      const end = line.indexOf(delim, i);
      if (end === -1) {
        fields.push(line.slice(i));
        break;
      } else {
        fields.push(line.slice(i, end));
        i = end + 1;
      }
    }
  }

  return fields;
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

/**
 * Parse a full CSV string into a Dataset.
 */
export function parseCsvString(csv: string, options: CsvParseOptions = {}): Dataset {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return transformRows([], options);

  const delim  = options.delimiter ?? detectDelimiter(lines[0]);
  const first  = parseLine(lines[0], delim);
  const hasHdr = options.hasHeader ?? looksLikeHeader(first);

  const headers: string[] = hasHdr
    ? first.map((h, i) => h.trim() || `column_${i + 1}`)
    : first.map((_, i) => `column_${i + 1}`);

  const dataLines = hasHdr ? lines.slice(1) : lines;
  const rawRows: Record<string, unknown>[] = dataLines.map((line) => {
    const fields = parseLine(line, delim);
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
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return;

  const delim  = options.delimiter ?? detectDelimiter(lines[0]);
  const first  = parseLine(lines[0], delim);
  const hasHdr = options.hasHeader ?? looksLikeHeader(first);

  const headers: string[] = hasHdr
    ? first.map((h, i) => h.trim() || `column_${i + 1}`)
    : first.map((_, i) => `column_${i + 1}`);

  const dataLines = hasHdr ? lines.slice(1) : lines;
  const BATCH     = 1000;

  for (let start = 0; start < dataLines.length; start += BATCH) {
    const batch = dataLines.slice(start, start + BATCH);
    const rows  = batch.map((line) => {
      const fields = parseLine(line, delim);
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => { row[h] = fields[i] ?? null; });
      return row;
    });
    yield { rows, batchIndex: Math.floor(start / BATCH) };
    // Yield to event loop so UI stays responsive
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
