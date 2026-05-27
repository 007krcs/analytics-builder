import { describe, expect, it } from 'vitest';
import { EventBus } from './event-bus.js';

describe('EventBus', () => {
  it('emits to subscribed listeners', () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.on('dataset:removed', (p) => received.push(p.datasetId));
    bus.emit('dataset:removed', { datasetId: 'ds-1' });
    expect(received).toEqual(['ds-1']);
  });

  it('unsubscribe function removes the listener', () => {
    const bus = new EventBus();
    let count = 0;
    const unsub = bus.on('dataset:removed', () => { count++; });
    bus.emit('dataset:removed', { datasetId: 'a' });
    unsub();
    bus.emit('dataset:removed', { datasetId: 'b' });
    expect(count).toBe(1);
  });

  it('once() fires only the first time', () => {
    const bus = new EventBus();
    let count = 0;
    bus.once('dataset:removed', () => { count++; });
    bus.emit('dataset:removed', { datasetId: 'a' });
    bus.emit('dataset:removed', { datasetId: 'b' });
    expect(count).toBe(1);
  });

  it('listenerCount reflects subscriptions', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('dataset:removed')).toBe(0);
    bus.on('dataset:removed', () => {});
    bus.on('dataset:removed', () => {});
    expect(bus.listenerCount('dataset:removed')).toBe(2);
  });
});
