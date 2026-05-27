import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectWebSocket } from './websocket-connector.js';

/** Minimal WebSocket mock controllable from tests. */
class MockSocket {
  static instances: MockSocket[] = [];
  onopen?: () => void;
  onmessage?: (evt: { data: string }) => void;
  onclose?: () => void;
  onerror?: (evt: Event) => void;
  readyState = 0; // CONNECTING

  constructor(public url: string) {
    MockSocket.instances.push(this);
  }
  fakeOpen()                            { this.readyState = 1; this.onopen?.(); }
  fakeMessage(data: unknown)            { this.onmessage?.({ data: JSON.stringify(data) }); }
  fakeClose()                           { this.readyState = 3; this.onclose?.(); }
  close()                               { this.fakeClose(); }
}

beforeEach(() => { MockSocket.instances = []; vi.useFakeTimers(); });
afterEach(()  => { vi.useRealTimers(); });

describe('connectWebSocket — reconnect', () => {
  it('emits onOpen and processes incoming rows', () => {
    const batches: unknown[][] = [];
    connectWebSocket('ws://x', {
      onBatch: (r) => batches.push(r), batchSize: 2, flushIntervalMs: 100,
      socketFactory: (u) => new MockSocket(u) as unknown as WebSocket,
    });
    const s = MockSocket.instances[0];
    s.fakeOpen();
    s.fakeMessage({ a: 1 });
    s.fakeMessage({ a: 2 });
    expect(batches).toEqual([[{ a: 1 }, { a: 2 }]]);
  });

  it('attempts to reconnect after the server closes the socket', () => {
    const attempts: number[] = [];
    connectWebSocket('ws://x', {
      onBatch: () => {},
      socketFactory: (u) => new MockSocket(u) as unknown as WebSocket,
      onReconnect: (n) => attempts.push(n),
      baseBackoffMs: 100, maxBackoffMs: 500,
    });
    const s1 = MockSocket.instances[0];
    s1.fakeOpen();
    s1.fakeClose();
    // First reconnect scheduled at +100ms
    expect(attempts).toEqual([1]);
    vi.advanceTimersByTime(100);
    expect(MockSocket.instances).toHaveLength(2);
    // Second close → +200ms
    MockSocket.instances[1].fakeClose();
    expect(attempts).toEqual([1, 2]);
    vi.advanceTimersByTime(200);
    expect(MockSocket.instances).toHaveLength(3);
  });

  it('resets backoff after a successful reconnect', () => {
    const attempts: number[] = [];
    connectWebSocket('ws://x', {
      onBatch: () => {},
      socketFactory: (u) => new MockSocket(u) as unknown as WebSocket,
      onReconnect: (n) => attempts.push(n),
      baseBackoffMs: 100,
    });
    MockSocket.instances[0].fakeOpen();
    MockSocket.instances[0].fakeClose();             // attempt 1 scheduled
    vi.advanceTimersByTime(100);
    MockSocket.instances[1].fakeOpen();              // success — counter resets
    MockSocket.instances[1].fakeClose();             // next attempt should be 1 again
    expect(attempts).toEqual([1, 1]);
  });

  it('stops reconnecting once disconnect() is called', () => {
    const attempts: number[] = [];
    const c = connectWebSocket('ws://x', {
      onBatch: () => {},
      socketFactory: (u) => new MockSocket(u) as unknown as WebSocket,
      onReconnect: (n) => attempts.push(n),
      baseBackoffMs: 100,
    });
    MockSocket.instances[0].fakeOpen();
    c.disconnect();
    MockSocket.instances[0].fakeClose();
    vi.advanceTimersByTime(10_000);
    expect(attempts).toHaveLength(0);
  });

  it('respects maxReconnectAttempts', () => {
    const attempts: number[] = [];
    connectWebSocket('ws://x', {
      onBatch: () => {},
      socketFactory: (u) => new MockSocket(u) as unknown as WebSocket,
      onReconnect: (n) => attempts.push(n),
      baseBackoffMs: 1, maxReconnectAttempts: 3,
    });
    MockSocket.instances[0].fakeOpen();
    // Force 5 close events; only 3 reconnects should be scheduled.
    for (let i = 0; i < 5; i++) {
      const s = MockSocket.instances[i];
      if (!s) break;
      s.fakeClose();
      vi.advanceTimersByTime(50);
    }
    expect(attempts).toHaveLength(3);
    expect(MockSocket.instances).toHaveLength(4); // original + 3 reconnects
  });
});
