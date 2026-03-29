/**
 * REST Connector — Fetch JSON API, auto-detect array path, auto-paginate.
 */

import type { Dataset } from '@analytix/core';
import { transformRows } from '../data-transformer.js';
import type { TransformOptions } from '../data-transformer.js';

export interface RestConnectorOptions extends TransformOptions {
  /** Override auto-detected path to the rows array in the response JSON */
  arrayPath?: string;
  /** Maximum pages to fetch (default: 20) */
  maxPages?: number;
  /** Pagination style (default: auto-detect) */
  pagination?: 'none' | 'offset' | 'page' | 'cursor' | 'link-header';
  /** Page size param name (default: 'limit' or 'page_size') */
  pageSizeParam?: string;
  /** Page size value (default: 100) */
  pageSize?: number;
  /** Offset param name (default: 'offset') */
  offsetParam?: string;
  /** Page number param name (default: 'page') */
  pageParam?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** If true, fetch all pages until no more data */
  fetchAll?: boolean;
}

// ── Array path detection ─────────────────────────────────────────────────────

function findArrayPath(obj: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  if (Array.isArray(obj)) return '';
  if (typeof obj !== 'object' || obj === null) return null;

  const record = obj as Record<string, unknown>;
  // Check common names first
  const preferred = ['data', 'results', 'items', 'records', 'rows', 'list', 'entries', 'content'];
  for (const key of preferred) {
    if (Array.isArray(record[key])) return key;
  }
  // Fallback: first array-valued key
  for (const [key, val] of Object.entries(record)) {
    if (Array.isArray(val)) return key;
    const nested = findArrayPath(val, depth + 1);
    if (nested !== null) return nested === '' ? key : `${key}.${nested}`;
  }
  return null;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// ── Next page detection ──────────────────────────────────────────────────────

function extractNextUrl(response: Response, body: Record<string, unknown>): string | null {
  // Link header: Link: <https://api.example.com/items?page=2>; rel="next"
  const linkHeader = response.headers.get('Link') ?? '';
  const linkMatch  = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  if (linkMatch) return linkMatch[1];

  // Body-level next URLs
  for (const key of ['next', 'next_url', 'nextPage', 'nextCursor']) {
    const val = body[key];
    if (typeof val === 'string' && val) return val;
  }
  return null;
}

// ── Main fetch function ──────────────────────────────────────────────────────

export async function fetchRestApi(
  url: string,
  options: RestConnectorOptions = {}
): Promise<Dataset> {
  const {
    maxPages    = 20,
    pageSize    = 100,
    pageSizeParam = 'limit',
    offsetParam   = 'offset',
    fetchAll      = false,
    headers       = {},
  } = options;

  const allRows: Record<string, unknown>[] = [];
  let   currentUrl = url;
  let   page       = 0;
  let   arrayPath  = options.arrayPath;

  while (page < maxPages) {
    // Build paginated URL for offset-based pagination
    if (page > 0 && !currentUrl.includes(offsetParam)) {
      const sep = currentUrl.includes('?') ? '&' : '?';
      currentUrl = `${currentUrl}${sep}${pageSizeParam}=${pageSize}&${offsetParam}=${page * pageSize}`;
    }

    const response = await fetch(currentUrl, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText} — ${currentUrl}`);

    const raw = (await response.json()) as unknown;

    // Auto-detect array path on first page
    if (arrayPath === undefined) {
      const detected = findArrayPath(raw);
      arrayPath = detected ?? '';
    }

    const rows: unknown[] = arrayPath === ''
      ? (Array.isArray(raw) ? raw : [])
      : (getNestedValue(raw as Record<string, unknown>, arrayPath) as unknown[] ?? []);

    if (!Array.isArray(rows) || rows.length === 0) break;

    allRows.push(...(rows as Record<string, unknown>[]));

    if (!fetchAll || rows.length < pageSize) break;

    const nextUrl = extractNextUrl(response, raw as Record<string, unknown>);
    if (nextUrl) {
      currentUrl = nextUrl;
    } else {
      page++;
    }
  }

  return transformRows(allRows, {
    ...options,
    datasetName: options.datasetName ?? new URL(url).hostname,
  });
}
