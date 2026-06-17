/**
 * Server-Sent Events (SSE) connector — streams rows from an EventSource.
 *
 * EventSource handles reconnection natively (the browser retries on drop and
 * honours the server's `retry:` hint), so this connector focuses on framing:
 * parse each event into a row, batch them, and flush on size or interval.
 * The EventSource is injectable so it tests without a real network.
 */

import type { Row } from '@gridstorm/analytix-core';

/** The subset of EventSource we use — lets tests inject a mock. */
export interface EventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  onopen: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  close(): void;
  readonly readyState: number;
}

export interface SseConnectorOptions {
  /** Rows to buffer before emitting a batch (default 50). */
  batchSize?: number;
  /** Max ms to wait before flushing a partial batch (default 500). */
  flushIntervalMs?: number;
  /** Transform a raw event payload into a row (default JSON.parse). */
  messageToRow?: (data: string) => Row | null;
  /** Called on each batch of new rows. */
  onBatch: (rows: Row[]) => void;
  /** Named events to listen for in addition to the default 'message'. */
  events?: string[];
  /** Called when the stream opens (or re-opens after a reconnect). */
  onOpen?: () => void;
  /** Called on a stream error (EventSource will then auto-retry). */
  onError?: (event: Event) => void;
  /** Send cookies with the request. */
  withCredentials?: boolean;
  /** EventSource factory — inject a mock in tests; defaults to global EventSource. */
  eventSourceFactory?: (url: string, init?: { withCredentials?: boolean }) => EventSourceLike;
}

export interface SseConnector {
  /** Close the stream and stop flushing. */
  disconnect: () => void;
  /** Whether the stream is currently open (readyState OPEN). */
  readonly isConnected: boolean;
  /** Total rows received since connect. */
  readonly rowCount: number;
}

export function connectSSE(url: string, options: SseConnectorOptions): SseConnector {
  const {
    batchSize = 50,
    flushIntervalMs = 500,
    messageToRow = (data) => { try { return JSON.parse(data) as Row; } catch { return null; } },
    onBatch,
    events = [],
    onOpen,
    onError,
    withCredentials,
    eventSourceFactory,
  } = options;

  const factory = eventSourceFactory
    ?? ((u: string, init?: { withCredentials?: boolean }) =>
        new EventSource(u, init) as unknown as EventSourceLike);

  const source = factory(url, { withCredentials });
  let buffer: Row[] = [];
  let rowCount = 0;
  let connected = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  function flush() {
    if (buffer.length === 0) return;
    onBatch(buffer);
    buffer = [];
  }

  const handleMessage = (evt: MessageEvent) => {
    const row = messageToRow(String(evt.data));
    if (!row) return;
    buffer.push(row);
    rowCount++;
    if (buffer.length >= batchSize) flush();
  };

  source.addEventListener('message', handleMessage);
  for (const name of events) source.addEventListener(name, handleMessage);

  source.onopen = () => {
    connected = true;
    if (!flushTimer) flushTimer = setInterval(flush, flushIntervalMs);
    onOpen?.();
  };
  source.onerror = (evt) => {
    connected = false;
    onError?.(evt);
    // EventSource retries on its own; we keep the flush timer running.
  };

  return {
    disconnect() {
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      flush();
      source.close();
      connected = false;
    },
    get isConnected() { return connected; },
    get rowCount() { return rowCount; },
  };
}
