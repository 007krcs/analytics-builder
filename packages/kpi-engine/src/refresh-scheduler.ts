// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * RefreshScheduler — manages periodic and cron-style KPI refresh.
 *
 * Features:
 *  - setTimeout-based tick loop (per-tick delay) so we can apply per-handle
 *    exponential backoff on failures (1×, 2×, 4×, …, up to 30× interval).
 *  - Cron expression parsing (5-field) with REAL timezone support via
 *    Intl.DateTimeFormat.
 *  - Hierarchical cron walker (climbs month → day → hour → minute) rather than
 *    a 525,600-minute brute-force loop.
 *  - Pause-on-hidden via document.visibilityState.
 *  - MaxRefreshes cap.
 *  - Cancellation via stop(kpiId).
 */

import type { RefreshPolicy } from '@gridstorm/analytix-core';
import type { RefreshHandle } from './types.js';

export type RefreshCallback = (kpiId: string) => void | Promise<void>;

/** Multiplier sequence applied to the base interval after consecutive failures. */
const BACKOFF_MULTIPLIERS = [1, 2, 4, 8, 16, 30];

/**
 * Manages interval-based refresh schedules for KPIs.
 */
export class RefreshScheduler {
  private readonly handles = new Map<string, RefreshHandle>();
  private readonly callbacks = new Set<RefreshCallback>();
  private _visibilityPaused = false;

  constructor() {
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
   * Schedule a KPI for auto-refresh. Returns the kpiId; call stop(kpiId) to cancel.
   */
  schedule(kpiId: string, policy: RefreshPolicy): string {
    if (!policy.enabled) return kpiId;
    this.stop(kpiId);

    const intervalMs = Math.max(50, policy.intervalSeconds * 1000);

    const tick = async () => {
      const handle = this.handles.get(kpiId);
      if (!handle) return;

      if (this._visibilityPaused && policy.pauseWhenHidden) {
        // Skip work but keep the loop alive on the base interval.
        handle.timeoutId = setTimeout(tick, intervalMs);
        return;
      }

      handle.refreshCount++;
      let anyError = false;
      for (const cb of this.callbacks) {
        try {
          await cb(kpiId);
        } catch {
          anyError = true;
        }
      }

      if (anyError) {
        handle.consecutiveErrors++;
      } else {
        handle.consecutiveErrors = 0;
      }

      if (policy.maxRefreshes !== undefined && handle.refreshCount >= policy.maxRefreshes) {
        this.stop(kpiId);
        return;
      }

      const idx = Math.min(handle.consecutiveErrors, BACKOFF_MULTIPLIERS.length - 1);
      const delay = intervalMs * BACKOFF_MULTIPLIERS[idx];
      handle.timeoutId = setTimeout(tick, delay);
    };

    const timeoutId = setTimeout(tick, intervalMs);
    this.handles.set(kpiId, {
      kpiId,
      timeoutId,
      refreshCount: 0,
      startedAt: new Date(),
      consecutiveErrors: 0,
    });

    return kpiId;
  }

  scheduleMany(entries: Array<{ kpiId: string; policy: RefreshPolicy }>): void {
    for (const { kpiId, policy } of entries) this.schedule(kpiId, policy);
  }

  stop(kpiId: string): void {
    const handle = this.handles.get(kpiId);
    if (handle) {
      clearTimeout(handle.timeoutId);
      this.handles.delete(kpiId);
    }
  }

  stopAll(): void {
    for (const handle of this.handles.values()) clearTimeout(handle.timeoutId);
    this.handles.clear();
  }

  getHandle(kpiId: string): RefreshHandle | undefined { return this.handles.get(kpiId); }
  getScheduledIds(): string[] { return Array.from(this.handles.keys()); }
  get count(): number { return this.handles.size; }

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

// ─── Cron parsing ─────────────────────────────────────────────────────────────

export interface ParsedCron {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

/**
 * Parse a 5-field cron expression into arrays of matching values.
 * Supports: wildcard (*), step (∗/n), ranges (a-b), lists (a,b,c).
 */
export function parseCronExpression(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Invalid cron expression: "${expr}". Expected 5 fields.`);
  }
  const [minuteStr, hourStr, domStr, monthStr, dowStr] = fields;
  return {
    minute:     parseCronField(minuteStr, 0, 59),
    hour:       parseCronField(hourStr, 0, 23),
    dayOfMonth: parseCronField(domStr, 1, 31),
    month:      parseCronField(monthStr, 1, 12),
    dayOfWeek:  parseCronField(dowStr, 0, 6),
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

// ─── Timezone-aware cron walker ───────────────────────────────────────────────
//
// We compute the next match in the target timezone's *wall clock*. The
// algorithm climbs hierarchically — year → month → day → hour → minute — and
// only iterates the field set, never 525,600 minutes.
//
// The candidate is stored as a UTC instant. Whenever we need to inspect its
// "local" components in the target timezone, we use Intl.DateTimeFormat. To
// snap a wall-clock combination back to a UTC instant we do a coarse search:
// take the candidate's UTC ms and try ±14h offsets (the maximum standard TZ
// offset range) by re-formatting until the wall-clock fields line up.

const WALL_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
function getFormatter(tz: string): Intl.DateTimeFormat {
  let f = WALL_FMT_CACHE.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', weekday:'short',
    });
    WALL_FMT_CACHE.set(tz, f);
  }
  return f;
}

interface WallClock {
  year: number; month: number; day: number;
  hour: number; minute: number; weekday: number; // 0=Sunday
}

const WEEKDAY_MAP: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };

function wallClockIn(date: Date, tz?: string): WallClock {
  if (!tz) {
    return {
      year:    date.getFullYear(),
      month:   date.getMonth() + 1,
      day:     date.getDate(),
      hour:    date.getHours(),
      minute:  date.getMinutes(),
      weekday: date.getDay(),
    };
  }
  const parts = getFormatter(tz).formatToParts(date);
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  return {
    year:    +pick('year'),
    month:   +pick('month'),
    day:     +pick('day'),
    hour:    +pick('hour') % 24, // en-US sometimes emits "24" for midnight
    minute:  +pick('minute'),
    weekday: WEEKDAY_MAP[pick('weekday')] ?? 0,
  };
}

/** Days in `month` of `year`, accounting for leap years. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Snap a target wall-clock (year/month/day/hour/minute) in `tz` back to a UTC Date. */
function wallToInstant(target: { year: number; month: number; day: number; hour: number; minute: number }, tz?: string): Date {
  // First guess: interpret as local-time UTC
  let guess = new Date(Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, 0));
  if (!tz) {
    // No timezone: use local Date constructor instead
    return new Date(target.year, target.month - 1, target.day, target.hour, target.minute, 0);
  }
  // Adjust by the offset between the guess's wall-clock-in-TZ and the target.
  for (let iter = 0; iter < 4; iter++) {
    const wc = wallClockIn(guess, tz);
    const diffMinutes =
      (target.year   - wc.year)   * 525_600 +
      (target.month  - wc.month)  * 43_200  +
      (target.day    - wc.day)    * 1_440   +
      (target.hour   - wc.hour)   * 60      +
      (target.minute - wc.minute);
    if (diffMinutes === 0) return guess;
    guess = new Date(guess.getTime() + diffMinutes * 60_000);
  }
  return guess;
}

/**
 * Given a parsed cron, compute the next Date strictly *after* `from` in `tz`.
 * Walks the field hierarchy — typically <100 iterations regardless of cron sparsity.
 */
export function nextCronDate(cron: ParsedCron, from: Date, tz?: string): Date {
  // Start one minute after `from`.
  const start = new Date(from.getTime() + 60_000);

  const sortedMonths   = [...cron.month].sort((a,b)=>a-b);
  const sortedHours    = [...cron.hour].sort((a,b)=>a-b);
  const sortedMinutes  = [...cron.minute].sort((a,b)=>a-b);

  let wc = wallClockIn(start, tz);
  wc = { ...wc, minute: wc.minute };  // zero seconds implicit

  // Cap year search to 4 years out — same contract as the old implementation.
  const yearLimit = wc.year + 4;

  while (wc.year <= yearLimit) {
    // Find next month >= current
    const nextMonth = sortedMonths.find((m) => m >= wc.month);
    if (nextMonth === undefined) {
      wc = { year: wc.year + 1, month: sortedMonths[0], day: 1, hour: 0, minute: 0, weekday: 0 };
      continue;
    }
    if (nextMonth !== wc.month) {
      wc = { year: wc.year, month: nextMonth, day: 1, hour: 0, minute: 0, weekday: 0 };
    }

    const dim = daysInMonth(wc.year, wc.month);
    const validDoms = cron.dayOfMonth.filter((d) => d <= dim).sort((a,b)=>a-b);
    const nextDom = validDoms.find((d) => d >= wc.day);
    if (nextDom === undefined) {
      // No valid DOM this month — advance month
      wc = { year: wc.year, month: wc.month + 1, day: 1, hour: 0, minute: 0, weekday: 0 };
      if (wc.month > 12) { wc.year++; wc.month = 1; }
      continue;
    }
    if (nextDom !== wc.day) {
      wc = { year: wc.year, month: wc.month, day: nextDom, hour: 0, minute: 0, weekday: 0 };
    }

    // Compute the day-of-week for this candidate by snapping to an instant
    const dayInstant = wallToInstant({ year: wc.year, month: wc.month, day: wc.day, hour: 0, minute: 0 }, tz);
    const dayWc = wallClockIn(dayInstant, tz);
    if (!cron.dayOfWeek.includes(dayWc.weekday)) {
      // Advance day by 1
      wc = { year: wc.year, month: wc.month, day: wc.day + 1, hour: 0, minute: 0, weekday: 0 };
      if (wc.day > dim) {
        wc.day = 1; wc.month++;
        if (wc.month > 12) { wc.year++; wc.month = 1; }
      }
      continue;
    }

    const nextHour = sortedHours.find((h) => h >= wc.hour);
    if (nextHour === undefined) {
      // Advance to next day
      wc = { year: wc.year, month: wc.month, day: wc.day + 1, hour: 0, minute: 0, weekday: 0 };
      if (wc.day > dim) {
        wc.day = 1; wc.month++;
        if (wc.month > 12) { wc.year++; wc.month = 1; }
      }
      continue;
    }
    if (nextHour !== wc.hour) {
      wc = { year: wc.year, month: wc.month, day: wc.day, hour: nextHour, minute: 0, weekday: 0 };
    }

    const nextMinute = sortedMinutes.find((m) => m >= wc.minute);
    if (nextMinute === undefined) {
      // Advance to next hour
      wc = { year: wc.year, month: wc.month, day: wc.day, hour: wc.hour + 1, minute: 0, weekday: 0 };
      if (wc.hour > 23) {
        wc.hour = 0; wc.day++;
        if (wc.day > dim) {
          wc.day = 1; wc.month++;
          if (wc.month > 12) { wc.year++; wc.month = 1; }
        }
      }
      continue;
    }
    wc.minute = nextMinute;

    // Found a candidate — snap to UTC instant and return
    return wallToInstant({ year: wc.year, month: wc.month, day: wc.day, hour: wc.hour, minute: wc.minute }, tz);
  }

  throw new Error('Could not find next cron date within 4 years');
}

/** Singleton scheduler instance */
export const refreshScheduler = new RefreshScheduler();
