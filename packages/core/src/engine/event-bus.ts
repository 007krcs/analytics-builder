/**
 * Typed event bus for inter-engine communication.
 * Supports wildcard listeners and once() subscriptions.
 */

import type { PivotResult } from '../types/pivot.js';
import type { KpiResult } from '../types/kpi.js';
import type { ReportRunResult } from '../types/report.js';
import type { Dataset } from '../types/dataset.js';

/** All analytics events */
export interface AnalyticsEventMap {
  // Dataset events
  'dataset:added': { dataset: Dataset };
  'dataset:removed': { datasetId: string };
  'dataset:updated': { dataset: Dataset };

  // Pivot events
  'pivot:computed': { result: PivotResult };
  'pivot:error': { configId: string; error: Error };
  'pivot:config:changed': { configId: string };

  // Chart events
  'chart:config:changed': { chartId: string };
  'chart:data:ready': { chartId: string; data: unknown[] };

  // KPI events
  'kpi:computed': { result: KpiResult };
  'kpi:error': { configId: string; error: Error };
  'kpi:refreshed': { configId: string; result: KpiResult };
  'kpi:threshold:crossed': {
    configId: string;
    previousStatus: string;
    newStatus: string;
    value: number;
  };

  // Report events
  'report:generated': { result: ReportRunResult };
  'report:error': { reportId: string; error: Error };
  'report:schedule:fired': { scheduleId: string };

  // Engine lifecycle
  'engine:ready': Record<string, never>;
  'engine:destroyed': Record<string, never>;
  'engine:error': { error: Error; context?: string };
}

export type EventName = keyof AnalyticsEventMap;
export type EventPayload<T extends EventName> = AnalyticsEventMap[T];
export type EventHandler<T extends EventName> = (payload: EventPayload<T>) => void;

interface Subscription<T extends EventName> {
  handler: EventHandler<T>;
  once: boolean;
}

/**
 * Strongly-typed event bus.
 * Supports wildcard '*' listener that receives all events.
 */
export class EventBus {
  private readonly listeners = new Map<
    EventName | '*',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Set<Subscription<any>>
  >();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    return this._addListener(event, handler, false);
  }

  /** Subscribe to an event once. Auto-unsubscribes after first emission. */
  once<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    return this._addListener(event, handler, true);
  }

  /** Subscribe to ALL events. Handler receives (eventName, payload). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAny(handler: (event: EventName, payload: unknown) => void): () => void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub: Subscription<any> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: handler as unknown as EventHandler<any>,
      once: false,
    };
    if (!this.listeners.has('*')) {
      this.listeners.set('*', new Set());
    }
    this.listeners.get('*')!.add(sub);
    return () => {
      this.listeners.get('*')?.delete(sub);
    };
  }

  /** Emit an event to all subscribers */
  emit<T extends EventName>(event: T, payload: EventPayload<T>): void {
    // Specific listeners
    const subs = this.listeners.get(event);
    if (subs) {
      const toRemove: Subscription<T>[] = [];
      for (const sub of subs) {
        sub.handler(payload);
        if (sub.once) toRemove.push(sub);
      }
      for (const sub of toRemove) {
        subs.delete(sub);
      }
    }

    // Wildcard listeners
    const wildcardSubs = this.listeners.get('*');
    if (wildcardSubs) {
      for (const sub of wildcardSubs) {
        (sub.handler as (e: EventName, p: unknown) => void)(event, payload);
      }
    }
  }

  /** Remove all listeners for an event, or all listeners entirely */
  off(event?: EventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /** Return the number of listeners for a given event */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  private _addListener<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    once: boolean
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const sub: Subscription<T> = { handler, once };
    this.listeners.get(event)!.add(sub);
    return () => {
      this.listeners.get(event)?.delete(sub);
    };
  }
}

/** Singleton event bus instance */
export const globalEventBus = new EventBus();
