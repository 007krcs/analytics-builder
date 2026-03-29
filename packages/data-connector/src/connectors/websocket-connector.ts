/**
 * WebSocket Connector — Streaming rows with buffer + batch updates.
 */

import type { Row } from '@analytix/core';

export interface WebSocketConnectorOptions {
  /** How many rows to buffer before emitting a batch (default: 50) */
  batchSize?: number;
  /** How long to wait before flushing a partial batch in ms (default: 500) */
  flushIntervalMs?: number;
  /** Transform raw message to row (default: JSON.parse) */
  messageToRow?: (data: string) => Row | null;
  /** Called on each batch of new rows */
  onBatch: (rows: Row[]) => void;
  /** Called when connection opens */
  onOpen?: () => void;
  /** Called when connection closes */
  onClose?: () => void;
  /** Called on connection error */
  onError?: (err: Event) => void;
}

export interface WebSocketConnector {
  /** Disconnect and clean up */
  disconnect: () => void;
  /** Whether the socket is currently open */
  readonly isConnected: boolean;
  /** Total rows received since connect */
  readonly rowCount: number;
}

/** Direction of change for a cell value (for sparkline indicators) */
export type CellChangeDirection = 'up' | 'down' | 'flat';

/** Track per-cell change directions */
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

export function connectWebSocket(url: string, options: WebSocketConnectorOptions): WebSocketConnector {
  const {
    batchSize      = 50,
    flushIntervalMs = 500,
    messageToRow   = (data) => { try { return JSON.parse(data) as Row; } catch { return null; } },
    onBatch,
    onOpen,
    onClose,
    onError,
  } = options;

  let socket:    WebSocket | null  = new WebSocket(url);
  let buffer:    Row[]             = [];
  let rowCount   = 0;
  let connected  = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  function flush() {
    if (buffer.length === 0) return;
    onBatch([...buffer]);
    buffer = [];
  }

  socket.onopen = () => {
    connected  = true;
    flushTimer = setInterval(flush, flushIntervalMs);
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
    flush(); // flush remaining
    onClose?.();
  };

  socket.onerror = (evt) => {
    onError?.(evt);
  };

  return {
    disconnect() {
      if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
      socket?.close();
      socket = null;
    },
    get isConnected() { return connected; },
    get rowCount()    { return rowCount; },
  };
}
