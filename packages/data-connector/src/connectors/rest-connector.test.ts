import { describe, expect, it, vi } from 'vitest';
import { fetchRestApi } from './rest-connector.js';

function mkResponse(body: unknown, init: { status?: number; headers?: Record<string,string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status:  init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('fetchRestApi', () => {
  it('parses a flat JSON array response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mkResponse([{ a: 1 }, { a: 2 }]));
    const ds = await fetchRestApi('http://x/api', { fetchImpl });
    expect(ds.rows).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('auto-detects "data" array path', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mkResponse({ data: [{ x: 1 }, { x: 2 }, { x: 3 }] }));
    const ds = await fetchRestApi('http://x/api', { fetchImpl });
    expect(ds.rows).toHaveLength(3);
  });

  it('retries on 5xx then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(mkResponse({}, { status: 503 }))
      .mockResolvedValueOnce(mkResponse({}, { status: 502 }))
      .mockResolvedValueOnce(mkResponse([{ ok: true }]));
    const ds = await fetchRestApi('http://x/api', { fetchImpl, retryBackoffMs: 0 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(ds.rows).toHaveLength(1);
  });

  it('gives up after retries on persistent 5xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mkResponse({}, { status: 500 }));
    await expect(fetchRestApi('http://x/api', { fetchImpl, retries: 2, retryBackoffMs: 0 }))
      .rejects.toThrow(/HTTP 500/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('aborts on timeout', async () => {
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
      })
    );
    await expect(fetchRestApi('http://x/api', { fetchImpl, timeoutMs: 20, retries: 0 }))
      .rejects.toThrow();
  });

  it('refuses to accumulate beyond maxRows', async () => {
    // Each page returns pageSize rows; with maxRows=150 and pageSize=100, abort on page 2.
    const fetchImpl = vi.fn().mockImplementation(() =>
      Promise.resolve(mkResponse(Array.from({ length: 100 }, (_, i) => ({ i })))));
    await expect(fetchRestApi('http://x/api', {
      fetchImpl, fetchAll: true, pageSize: 100, maxRows: 150,
    })).rejects.toThrow(/maxRows=150/);
  });
});
