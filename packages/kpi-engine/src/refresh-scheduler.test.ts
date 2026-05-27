import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RefreshScheduler,
  parseCronExpression,
  nextCronDate,
} from './refresh-scheduler.js';

describe('parseCronExpression', () => {
  it('parses 5 fields with wildcards', () => {
    const c = parseCronExpression('* * * * *');
    expect(c.minute).toHaveLength(60);
    expect(c.hour).toHaveLength(24);
  });
  it('rejects expressions with wrong field count', () => {
    expect(() => parseCronExpression('0 0 *')).toThrow();
  });
  it('parses ranges and steps', () => {
    const c = parseCronExpression('0 9-17 * * 1-5');
    expect(c.hour).toEqual([9,10,11,12,13,14,15,16,17]);
    expect(c.dayOfWeek).toEqual([1,2,3,4,5]);
  });
});

describe('nextCronDate — hierarchical walker', () => {
  it('finds the next match for "0 12 * * *" (noon daily)', () => {
    const cron = parseCronExpression('0 12 * * *');
    const from = new Date('2026-06-01T10:00:00Z');
    const next = nextCronDate(cron, from, 'UTC');
    expect(next.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('finds the next sparse yearly cron quickly (no 525k-iter scan)', () => {
    const cron = parseCronExpression('0 0 1 1 *');
    const from = new Date('2026-06-15T00:00:00Z');
    const t0 = performance.now();
    const next = nextCronDate(cron, from, 'UTC');
    const dt = performance.now() - t0;
    expect(next.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(dt).toBeLessThan(5); // hierarchical walk = <100 iters
  });

  it('throws on impossible expressions instead of looping 4 years', () => {
    const cron = parseCronExpression('0 0 31 2 *');   // Feb 31 — never
    const t0 = performance.now();
    expect(() => nextCronDate(cron, new Date(), 'UTC')).toThrow(/within 4 years/);
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(50);
  });

  it('respects the timezone argument (12:00 in NY ≠ 12:00 in Tokyo)', () => {
    const cron = parseCronExpression('0 12 * * *');
    const from = new Date('2026-06-01T00:00:00Z');
    const ny    = nextCronDate(cron, from, 'America/New_York');
    const tokyo = nextCronDate(cron, from, 'Asia/Tokyo');
    expect(ny.getTime()).not.toBe(tokyo.getTime());
    // 12:00 in Tokyo = 03:00 UTC; 12:00 in NY = 16:00 UTC (EDT)
    expect(tokyo.toISOString()).toBe('2026-06-01T03:00:00.000Z');
    expect(ny.toISOString()).toBe('2026-06-01T16:00:00.000Z');
  });

  it('respects the timezone for sparse yearly cron', () => {
    const cron = parseCronExpression('0 0 1 1 *');
    const utc   = nextCronDate(cron, new Date('2026-06-01T00:00:00Z'), 'UTC');
    const tokyo = nextCronDate(cron, new Date('2026-06-01T00:00:00Z'), 'Asia/Tokyo');
    expect(utc.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    expect(tokyo.toISOString()).toBe('2026-12-31T15:00:00.000Z'); // midnight Jan 1 Tokyo = 15:00 Dec 31 UTC
  });
});

describe('RefreshScheduler — backoff', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('runs callbacks at the configured interval when no errors occur', async () => {
    const sched = new RefreshScheduler();
    let n = 0;
    sched.onRefresh(() => { n++; });
    sched.schedule('k1', { enabled: true, intervalSeconds: 1 });
    await vi.advanceTimersByTimeAsync(1000); expect(n).toBe(1);
    await vi.advanceTimersByTimeAsync(1000); expect(n).toBe(2);
    await vi.advanceTimersByTimeAsync(1000); expect(n).toBe(3);
    sched.destroy();
  });

  it('backs off exponentially on consecutive failures', async () => {
    const sched = new RefreshScheduler();
    let calls = 0;
    sched.onRefresh(() => { calls++; throw new Error('fail'); });
    sched.schedule('k', { enabled: true, intervalSeconds: 1 });

    await vi.advanceTimersByTimeAsync(1000); expect(calls).toBe(1); // attempt 1, err → backoff ×2 = 2s
    await vi.advanceTimersByTimeAsync(1999); expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(1);    expect(calls).toBe(2); // attempt 2, err → backoff ×4 = 4s
    await vi.advanceTimersByTimeAsync(3999); expect(calls).toBe(2);
    await vi.advanceTimersByTimeAsync(1);    expect(calls).toBe(3);

    const handle = sched.getHandle('k');
    expect(handle?.consecutiveErrors).toBe(3);
    sched.destroy();
  });

  it('resets backoff on first success', async () => {
    const sched = new RefreshScheduler();
    let shouldFail = true, n = 0;
    sched.onRefresh(() => {
      n++;
      if (shouldFail) throw new Error('fail');
    });
    sched.schedule('k', { enabled: true, intervalSeconds: 1 });

    await vi.advanceTimersByTimeAsync(1000); // attempt 1 — fail → next at +2s
    await vi.advanceTimersByTimeAsync(2000); // attempt 2 — fail → next at +4s
    expect(n).toBe(2);
    shouldFail = false;
    await vi.advanceTimersByTimeAsync(4000); // attempt 3 — success → back to base interval
    expect(n).toBe(3);
    expect(sched.getHandle('k')?.consecutiveErrors).toBe(0);
    await vi.advanceTimersByTimeAsync(1000); expect(n).toBe(4);
    sched.destroy();
  });

  it('stops after maxRefreshes', async () => {
    const sched = new RefreshScheduler();
    let n = 0;
    sched.onRefresh(() => { n++; });
    sched.schedule('k', { enabled: true, intervalSeconds: 1, maxRefreshes: 3 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(n).toBe(3);
    expect(sched.count).toBe(0);
  });
});
