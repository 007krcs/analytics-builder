import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectSSE, type EventSourceLike } from './sse-connector.js';

class MockEventSource implements EventSourceLike {
  static last: MockEventSource | null = null;
  readyState = 0;
  onopen: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  private listeners = new Map<string, Array<(e: MessageEvent) => void>>();
  closed = false;

  constructor(public url: string) { MockEventSource.last = this; }
  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    (this.listeners.get(type) ?? this.listeners.set(type, []).get(type)!).push(cb);
  }
  emit(type: string, data: unknown) {
    for (const cb of this.listeners.get(type) ?? []) cb({ data: JSON.stringify(data) } as MessageEvent);
  }
  open()  { this.readyState = 1; this.onopen?.({} as Event); }
  error() { this.readyState = 0; this.onerror?.({} as Event); }
  close() { this.closed = true; this.readyState = 2; }
}

const factory = (u: string) => new MockEventSource(u) as unknown as EventSourceLike;

beforeEach(() => { MockEventSource.last = null; vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('connectSSE', () => {
  it('batches messages and flushes at batchSize', () => {
    const batches: unknown[][] = [];
    connectSSE('http://x/stream', { onBatch: (r) => batches.push(r), batchSize: 2, eventSourceFactory: factory });
    const es = MockEventSource.last!;
    es.open();
    es.emit('message', { a: 1 });
    es.emit('message', { a: 2 });
    expect(batches).toEqual([[{ a: 1 }, { a: 2 }]]);
  });

  it('flushes a partial batch on the interval', () => {
    const batches: unknown[][] = [];
    connectSSE('http://x', { onBatch: (r) => batches.push(r), batchSize: 50, flushIntervalMs: 300, eventSourceFactory: factory });
    const es = MockEventSource.last!;
    es.open();
    es.emit('message', { a: 1 });
    expect(batches).toHaveLength(0);
    vi.advanceTimersByTime(300);
    expect(batches).toEqual([[{ a: 1 }]]);
  });

  it('listens to named events too', () => {
    const batches: unknown[][] = [];
    connectSSE('http://x', { onBatch: (r) => batches.push(r), batchSize: 1, events: ['tick'], eventSourceFactory: factory });
    const es = MockEventSource.last!;
    es.open();
    es.emit('tick', { price: 99 });
    expect(batches).toEqual([[{ price: 99 }]]);
  });

  it('drops unparseable payloads without crashing', () => {
    const batches: unknown[][] = [];
    connectSSE('http://x', {
      onBatch: (r) => batches.push(r), batchSize: 1, eventSourceFactory: factory,
      messageToRow: (d) => { try { return JSON.parse(d) as Record<string, unknown>; } catch { return null; } },
    });
    const es = MockEventSource.last!;
    es.open();
    // emit raw non-JSON by bypassing JSON.stringify
    for (const cb of (es as unknown as { listeners: Map<string, Array<(e: MessageEvent) => void>> }).listeners.get('message') ?? []) {
      cb({ data: 'not json' } as MessageEvent);
    }
    expect(batches).toHaveLength(0);
  });

  it('reports connection state and stops on disconnect', () => {
    const c = connectSSE('http://x', { onBatch: () => {}, eventSourceFactory: factory });
    const es = MockEventSource.last!;
    es.open();
    expect(c.isConnected).toBe(true);
    c.disconnect();
    expect(es.closed).toBe(true);
    expect(c.isConnected).toBe(false);
  });

  it('surfaces errors but keeps the connector alive (EventSource auto-retries)', () => {
    const onError = vi.fn();
    const c = connectSSE('http://x', { onBatch: () => {}, onError, eventSourceFactory: factory });
    const es = MockEventSource.last!;
    es.open();
    es.error();
    expect(onError).toHaveBeenCalledOnce();
    expect(c.isConnected).toBe(false);
    expect(es.closed).toBe(false); // not closed — browser will retry
  });
});
