// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * REST Connector — Fetch JSON API, auto-detect array path, auto-paginate.
 */

import type { Dataset } from '@gridstorm/analytix-core';
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
  /** Per-request timeout in ms (default 30 000). Set 0 to disable. */
  timeoutMs?: number;
  /** Number of retry attempts for 5xx / network errors (default 2 → 3 total). */
  retries?: number;
  /** Base backoff delay between retries in ms (default 500; exponential). */
  retryBackoffMs?: number;
  /** Hard cap on total rows accumulated across all pages (default 1 000 000). */
  maxRows?: number;
  /** Optional fetch override (used in tests; defaults to globalThis.fetch). */
  fetchImpl?: typeof fetch;
}

/** Internal — fetch a single URL with timeout + retry/backoff. */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs: number; retries: number; backoffMs: number; fetchImpl: typeof fetch }
): Promise<Response> {
  const { timeoutMs, retries, backoffMs, fetchImpl } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetchImpl(url, { ...init, signal: controller.signal });
      if (t) clearTimeout(t);
      // Retry on 5xx, surface 4xx immediately
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * 2 ** attempt));
        continue;
      }
      return res;
    } catch (err) {
      if (t) clearTimeout(t);
      lastErr = err;
      if (attempt >= retries) break;
      await new Promise((r) => setTimeout(r, backoffMs * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`REST request failed after ${retries + 1} attempts`);
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
    maxPages       = 20,
    pageSize       = 100,
    pageSizeParam  = 'limit',
    offsetParam    = 'offset',
    fetchAll       = false,
    headers        = {},
    timeoutMs      = 30_000,
    retries        = 2,
    retryBackoffMs = 500,
    maxRows        = 1_000_000,
    fetchImpl      = (globalThis as { fetch: typeof fetch }).fetch,
  } = options;

  if (!fetchImpl) throw new Error('No global fetch available; pass options.fetchImpl');

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

    const response = await fetchWithRetry(currentUrl, { headers }, {
      timeoutMs, retries, backoffMs: retryBackoffMs, fetchImpl,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText} — ${currentUrl}`);

    const raw = (await response.json()) as unknown;

    if (arrayPath === undefined) {
      const detected = findArrayPath(raw);
      arrayPath = detected ?? '';
    }

    const rows: unknown[] = arrayPath === ''
      ? (Array.isArray(raw) ? raw : [])
      : (getNestedValue(raw as Record<string, unknown>, arrayPath) as unknown[] ?? []);

    if (!Array.isArray(rows) || rows.length === 0) break;

    allRows.push(...(rows as Record<string, unknown>[]));

    // Enforce maxRows cap — refuse to silently accumulate gigabytes
    if (allRows.length >= maxRows) {
      throw new Error(
        `REST connector hit maxRows=${maxRows} (got ${allRows.length}). ` +
        `Raise maxRows or set fetchAll=false to scope this request.`
      );
    }

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
