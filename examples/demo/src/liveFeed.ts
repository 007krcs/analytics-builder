/**
 * liveFeed — in-page bridge between the Connect API tab (producer) and the
 * Sentinel tab (consumer). ConnectPanel publishes every ingested batch here;
 * Sentinel can watch the real feed instead of its simulated stream.
 */

import type { Row } from '@gridstorm/analytix-core';

type Listener = (rows: Row[]) => void;

const listeners = new Set<Listener>();
let totalRows = 0;
let lastBatch: Row[] = [];

export const liveFeed = {
  publish(rows: Row[]): void {
    if (!rows.length) return;
    totalRows += rows.length;
    lastBatch = rows;
    for (const fn of listeners) {
      try { fn(rows); } catch { /* listener errors must not break ingestion */ }
    }
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  /** Rows seen since page load — lets Sentinel show whether a feed exists. */
  get totalRows(): number { return totalRows; },
  /** Numeric columns of the most recent batch (what Sentinel can watch). */
  numericColumns(): string[] {
    const first = lastBatch[0];
    if (!first) return [];
    return Object.keys(first).filter((k) => typeof first[k] === 'number');
  },
};
