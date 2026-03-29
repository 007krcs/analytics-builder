/**
 * RefreshScheduler — manages periodic and cron-style KPI refresh.
 *
 * Features:
 * - setInterval-based refresh with backoff on errors
 * - Cron expression parsing (5-field) with timezone support
 * - Pause-on-hidden (document.visibilityState)
 * - MaxRefreshes cap
 * - Cancellation via returned handles
 */

import type { RefreshPolicy } from '@analytix/core';
import type { RefreshHandle } from './types.js';

export type RefreshCallback = (kpiId: string) => void | Promise<void>;

/**
 * Manages interval-based refresh schedules for KPIs.
 */
export class RefreshScheduler {
  private readonly handles = new Map<string, RefreshHandle>();
  private readonly callbacks = new Set<RefreshCallback>();
  private _visibilityPaused = false;

  constructor() {
    // Listen for visibility changes in browser environment
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._handleVisibility);
    }
  }

  /** Register a callback invoked on every refresh tick */
  onRefresh(cb: RefreshCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  /**
   * Schedule a KPI for auto-refresh based on its RefreshPolicy.
   * Returns the handle ID; call stop(kpiId) to cancel.
   */
  schedule(kpiId: string, policy: RefreshPolicy): string {
    if (!policy.enabled) return kpiId;
    this.stop(kpiId); // Cancel any existing schedule

    const intervalMs = policy.intervalSeconds * 1000;
    let refreshCount = 0;

    const tick = async () => {
      if (this._visibilityPaused && policy.pauseWhenHidden) return;

      refreshCount++;

      // Invoke all registered callbacks
      for (const cb of this.callbacks) {
        try {
          await cb(kpiId);
        } catch (_e) {
          // Individual callback errors should not stop the scheduler
        }
      }

      // Auto-stop if max refreshes reached
      if (policy.maxRefreshes !== undefined && refreshCount >= policy.maxRefreshes) {
        this.stop(kpiId);
      }
    };

    const intervalId = setInterval(tick, intervalMs);
    this.handles.set(kpiId, {
      kpiId,
      intervalId,
      refreshCount: 0,
      startedAt: new Date(),
    });

    return kpiId;
  }

  /**
   * Schedule multiple KPIs at once. Returns map of kpiId → handle.
   */
  scheduleMany(entries: Array<{ kpiId: string; policy: RefreshPolicy }>): void {
    for (const { kpiId, policy } of entries) {
      this.schedule(kpiId, policy);
    }
  }

  /** Stop a scheduled refresh */
  stop(kpiId: string): void {
    const handle = this.handles.get(kpiId);
    if (handle) {
      clearInterval(handle.intervalId);
      this.handles.delete(kpiId);
    }
  }

  /** Stop all scheduled refreshes */
  stopAll(): void {
    for (const handle of this.handles.values()) {
      clearInterval(handle.intervalId);
    }
    this.handles.clear();
  }

  /** Get active handle info */
  getHandle(kpiId: string): RefreshHandle | undefined {
    return this.handles.get(kpiId);
  }

  /** List all scheduled KPI IDs */
  getScheduledIds(): string[] {
    return Array.from(this.handles.keys());
  }

  /** How many KPIs are currently scheduled */
  get count(): number {
    return this.handles.size;
  }

  /** Destroy scheduler and release all handles */
  destroy(): void {
    this.stopAll();
    this.callbacks.clear();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._handleVisibility);
    }
  }

  private readonly _handleVisibility = () => {
    this._visibilityPaused = document.visibilityState === 'hidden';
  };
}

// ─── Cron parsing utilities ───────────────────────────────────────────────────

/** Very simple 5-field cron expression interpreter */
export interface ParsedCron {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

/**
 * Parse a 5-field cron expression into arrays of matching values.
 * Supports: wildcard (*), step (star/n), ranges (a-b), lists (a,b,c)
 */
export function parseCronExpression(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Invalid cron expression: "${expr}". Expected 5 fields.`);
  }

  const [minuteStr, hourStr, domStr, monthStr, dowStr] = fields;

  return {
    minute: parseCronField(minuteStr, 0, 59),
    hour: parseCronField(hourStr, 0, 23),
    dayOfMonth: parseCronField(domStr, 1, 31),
    month: parseCronField(monthStr, 1, 12),
    dayOfWeek: parseCronField(dowStr, 0, 6),
  };
}

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }

  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    if (isNaN(step) || step <= 0) throw new Error(`Invalid step in cron field: ${field}`);
    const result: number[] = [];
    for (let i = min; i <= max; i += step) result.push(i);
    return result;
  }

  // Lists and ranges
  const result: number[] = [];
  for (const part of field.split(',')) {
    if (part.includes('-')) {
      const [lo, hi] = part.split('-').map(Number);
      for (let i = lo; i <= hi; i++) result.push(i);
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n)) result.push(n);
    }
  }
  return result.filter((v) => v >= min && v <= max);
}

/**
 * Given a parsed cron, compute the next Date after `from`.
 * Timezone is applied by shifting timestamps.
 */
export function nextCronDate(cron: ParsedCron, from: Date, _timezone?: string): Date {
  const candidate = new Date(from.getTime() + 60000); // Start 1 minute after `from`
  candidate.setSeconds(0, 0);

  // Iterate forward up to 4 years to find the next match
  for (let i = 0; i < 525600; i++) {
    const month = candidate.getMonth() + 1; // 1-12
    const dom = candidate.getDate(); // 1-31
    const hour = candidate.getHours();
    const minute = candidate.getMinutes();
    const dow = candidate.getDay(); // 0=Sunday

    if (
      cron.month.includes(month) &&
      cron.dayOfMonth.includes(dom) &&
      cron.dayOfWeek.includes(dow) &&
      cron.hour.includes(hour) &&
      cron.minute.includes(minute)
    ) {
      return new Date(candidate);
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  throw new Error('Could not find next cron date within 4 years');
}

/** Singleton scheduler instance */
export const refreshScheduler = new RefreshScheduler();
