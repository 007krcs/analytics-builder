import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import { ReportBuilder } from './report-builder.js';
import { ScheduleRunner, ConsoleDeliverer, type Deliverer } from './schedule-runner.js';
import type { ReportRunResult, ScheduleConfig } from '@gridstorm/analytix-core';

class CapturingDeliverer implements Deliverer {
  readonly id = 'capture';
  readonly received: { result: ReportRunResult; schedule: ScheduleConfig }[] = [];
  async deliver(result: ReportRunResult, schedule: ScheduleConfig): Promise<void> {
    this.received.push({ result, schedule });
  }
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-06-01T00:00:00Z')); });
afterEach(() => { vi.useRealTimers(); });

describe('ScheduleRunner', () => {
  it('fires interval schedules on time and reschedules', async () => {
    const engine = new AnalyticsEngine();
    const report = new ReportBuilder('r', 'R')
      .text('hi')
      .schedule(
        { type: 'interval', intervalMinutes: 1 },
        ['pdf'],
        {},
      )
      .build();

    const cap = new CapturingDeliverer();
    const runner = new ScheduleRunner(engine, { deliverers: [cap] });
    runner.start(report);

    expect(runner.activeCount).toBe(1);
    expect(cap.received).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(cap.received).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(cap.received).toHaveLength(2);

    runner.stopAll();
    expect(runner.activeCount).toBe(0);
  });

  it('fires a one-time schedule exactly once', async () => {
    const engine = new AnalyticsEngine();
    const at = new Date('2026-06-01T00:00:30Z');
    const report = new ReportBuilder('r', 'R')
      .text('once')
      .schedule({ type: 'once', at }, ['pdf'], {})
      .build();

    const cap = new CapturingDeliverer();
    const runner = new ScheduleRunner(engine, { deliverers: [cap] });
    runner.start(report);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(cap.received).toHaveLength(1);
    expect(runner.activeCount).toBe(0);
  });

  it('fires a cron schedule (next minute)', async () => {
    const engine = new AnalyticsEngine();
    // System time fixed to 2026-06-01T00:00:00Z; "* * * * *" → next at 00:01:00Z
    const report = new ReportBuilder('r', 'R')
      .text('cron')
      .schedule(
        { type: 'cron', expression: '* * * * *', timezone: 'UTC' },
        ['pdf'],
        {},
      )
      .build();

    const cap = new CapturingDeliverer();
    const runner = new ScheduleRunner(engine, { deliverers: [cap] });
    runner.start(report);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(cap.received.length).toBeGreaterThanOrEqual(1);
    runner.stopAll();
  });

  it('emits report:schedule:fired on the engine event bus', async () => {
    const engine = new AnalyticsEngine();
    const fires: string[] = [];
    engine.eventBus.on('report:schedule:fired', (p) => fires.push(p.scheduleId));
    const report = new ReportBuilder('r', 'R').text('x').schedule(
      { type: 'interval', intervalMinutes: 1 }, ['pdf'], {},
    ).build();
    const runner = new ScheduleRunner(engine, { deliverers: [new ConsoleDeliverer()] });
    runner.start(report);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fires).toHaveLength(1);
    runner.stopAll();
  });
});
