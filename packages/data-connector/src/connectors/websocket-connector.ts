// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * WebSocket Connector — Streaming rows with buffer + batch updates +
 * automatic reconnect with exponential backoff.
 */

import type { Row } from '@gridstorm/analytix-core';

export interface WebSocketConnectorOptions {
  /** How many rows to buffer before emitting a batch (default: 50) */
  batchSize?: number;
  /** How long to wait before flushing a partial batch in ms (default: 500) */
  flushIntervalMs?: number;
  /** Transform raw message to row (default: JSON.parse) */
  messageToRow?: (data: string) => Row | null;
  /** Called on each batch of new rows */
  onBatch: (rows: Row[]) => void;
  /** Called when connection opens (including after a successful reconnect) */
  onOpen?: () => void;
  /** Called when connection closes (transient close before a reconnect attempt) */
  onClose?: () => void;
  /** Called on connection error */
  onError?: (err: Event) => void;
  /** Called whenever a reconnect attempt starts. `attempt` is 1-indexed. */
  onReconnect?: (attempt: number, delayMs: number) => void;

  /** Enable automatic reconnect (default: true) */
  reconnect?: boolean;
  /** Maximum reconnect attempts before giving up (default: 10) */
  maxReconnectAttempts?: number;
  /** Base backoff delay in ms (default: 1000). Doubles each attempt; capped at maxBackoffMs. */
  baseBackoffMs?: number;
  /** Maximum backoff delay in ms (default: 30 000) */
  maxBackoffMs?: number;
  /** WebSocket factory — pass a mock implementation in tests. */
  socketFactory?: (url: string) => WebSocket;
}

export interface WebSocketConnector {
  /** Disconnect and stop attempting to reconnect */
  disconnect: () => void;
  /** Whether the socket is currently open */
  readonly isConnected: boolean;
  /** Total rows received since (re-)connect */
  readonly rowCount: number;
  /** How many reconnect attempts have been made so far */
  readonly reconnectAttempts: number;
}

export type CellChangeDirection = 'up' | 'down' | 'flat';

export interface CellChangeTracker {
  getDirection(rowId: string, columnId: string): CellChangeDirection;
  update(rowId: string, columnId: string, newValue: number, oldValue: number): void;
}

export function createCellChangeTracker(): CellChangeTracker {
  const directions = new Map<string, CellChangeDirection>();
  return {
    getDirection(rowId, columnId) {
      return directions.get(`${rowId}::${columnId}`) ?? 'flat';
    },
    update(rowId, columnId, newValue, oldValue) {
      const key = `${rowId}::${columnId}`;
      if (newValue > oldValue)      directions.set(key, 'up');
      else if (newValue < oldValue) directions.set(key, 'down');
      else                          directions.set(key, 'flat');
    },
  };
}

export function connectWebSocket(
  url: string,
  options: WebSocketConnectorOptions
): WebSocketConnector {
  const {
    batchSize            = 50,
    flushIntervalMs      = 500,
    messageToRow         = (data) => { try { return JSON.parse(data) as Row; } catch { return null; } },
    onBatch,
    onOpen,
    onClose,
    onError,
    onReconnect,
    reconnect            = true,
    maxReconnectAttempts = 10,
    baseBackoffMs        = 1000,
    maxBackoffMs         = 30_000,
    socketFactory        = (u) => new WebSocket(u),
  } = options;

  let socket: WebSocket | null = null;
  let buffer: Row[] = [];
  let rowCount = 0;
  let connected = false;
  let reconnectAttempts = 0;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function flush() {
    if (buffer.length === 0) return;
    onBatch([...buffer]);
    buffer = [];
  }

  function scheduleReconnect() {
    if (disposed || !reconnect) return;
    if (reconnectAttempts >= maxReconnectAttempts) return;
    reconnectAttempts++;
    const delay = Math.min(maxBackoffMs, baseBackoffMs * 2 ** (reconnectAttempts - 1));
    onReconnect?.(reconnectAttempts, delay);
    reconnectTimer = setTimeout(open, delay);
  }

  function open() {
    if (disposed) return;
    socket = socketFactory(url);

    socket.onopen = () => {
      connected = true;
      reconnectAttempts = 0;
      if (!flushTimer) flushTimer = setInterval(flush, flushIntervalMs);
      onOpen?.();
    };

    socket.onmessage = (evt: MessageEvent) => {
      const row = messageToRow(String(evt.data));
      if (!row) return;
      buffer.push(row);
      rowCount++;
      if (buffer.length >= batchSize) flush();
    };

    socket.onclose = () => {
      connected = false;
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      flush();
      onClose?.();
      scheduleReconnect();
    };

    socket.onerror = (evt) => {
      onError?.(evt);
    };
  }

  open();

  return {
    disconnect() {
      disposed = true;
      if (flushTimer)     { clearInterval(flushTimer); flushTimer = null; }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      socket?.close();
      socket = null;
    },
    get isConnected()       { return connected; },
    get rowCount()          { return rowCount; },
    get reconnectAttempts() { return reconnectAttempts; },
  };
}
