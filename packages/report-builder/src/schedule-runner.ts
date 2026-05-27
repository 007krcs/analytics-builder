// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * ScheduleRunner — drives report ScheduleConfig entries on a real timer.
 *
 * The runner is intentionally agnostic about *how* a report is delivered.
 * Register a `Deliverer` per channel (console, webhook, email, …) and the
 * runner will hand each rendered ReportRunResult to every deliverer matching
 * the schedule's `delivery` shape.
 *
 * Unlike the old fluent .schedule(...) which only stored config, this class
 * actually fires.
 */

import type {
  ReportConfig,
  ReportFormat,
  ReportRunResult,
  ScheduleConfig,
  AnalyticsEngine,
} from '@gridstorm/analytix-core';
import { generateReport } from './report-builder.js';
import { parseCronExpression, nextCronDate } from '@gridstorm/analytix-kpi-engine';

export interface Deliverer {
  /** Unique deliverer id (for logging) */
  readonly id: string;
  /** Send a rendered report to its destination */
  deliver(result: ReportRunResult, schedule: ScheduleConfig): Promise<void>;
}

/** Reference deliverer that prints a summary to the console. */
export class ConsoleDeliverer implements Deliverer {
  readonly id = 'console';
  async deliver(result: ReportRunResult, schedule: ScheduleConfig): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[ScheduleRunner] delivered "${result.reportId}" (${result.format}, ` +
      `${result.data.length} b64 chars) via schedule "${schedule.name}"`
    );
  }
}

/** Webhook deliverer — POSTs the report payload as JSON. */
export class WebhookDeliverer implements Deliverer {
  readonly id = 'webhook';
  constructor(private readonly fetchImpl: typeof fetch = (globalThis as { fetch: typeof fetch }).fetch) {}
  async deliver(result: ReportRunResult, schedule: ScheduleConfig): Promise<void> {
    const url = schedule.delivery.webhookUrl;
    if (!url) return;
    await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId: result.reportId,
        format:   result.format,
        filename: result.filename,
        mimeType: result.mimeType,
        data:     result.data,
        generatedAt: result.generatedAt,
      }),
    });
  }
}

export interface ScheduleRunnerOptions {
  /** Deliverers to invoke. Defaults to [ConsoleDeliverer]. */
  deliverers?: Deliverer[];
  /** Override the time source — useful in tests. */
  now?: () => Date;
  /** Override scheduling primitives — useful in tests. */
  setTimer?: (cb: () => void, delayMs: number) => unknown;
  /** Override timer cancellation. */
  clearTimer?: (id: unknown) => void;
}

interface RunnerHandle {
  scheduleId: string;
  timerId: unknown;
  scheduleConfig: ScheduleConfig;
  reportConfig: ReportConfig;
}

export class ScheduleRunner {
  private readonly handles = new Map<string, RunnerHandle>();
  private readonly deliverers: Deliverer[];
  private readonly now: () => Date;
  private readonly setTimer: (cb: () => void, delayMs: number) => unknown;
  private readonly clearTimer: (id: unknown) => void;

  constructor(
    private readonly engine: AnalyticsEngine,
    options: ScheduleRunnerOptions = {}
  ) {
    this.deliverers = options.deliverers ?? [new ConsoleDeliverer()];
    this.now        = options.now        ?? (() => new Date());
    this.setTimer   = options.setTimer   ?? ((cb, d) => setTimeout(cb, d));
    this.clearTimer = options.clearTimer ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  }

  /** Start all enabled schedules attached to a ReportConfig. */
  start(report: ReportConfig): void {
    for (const sched of report.schedules) {
      if (sched.enabled) this.startOne(report, sched);
    }
  }

  /** Start a single schedule. Returns its id. */
  startOne(report: ReportConfig, sched: ScheduleConfig): string {
    this.stop(sched.id);
    const delay = this.delayUntilNextRun(sched);
    if (delay === null) return sched.id;

    const tick = async () => {
      const handle = this.handles.get(sched.id);
      if (!handle) return;
      try {
        for (const fmt of sched.formats) await this.runOnce(report, sched, fmt);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[ScheduleRunner] tick error for "${sched.name}":`, err);
      }
      // Reschedule for the next occurrence (cron/interval) — 'once' stops here.
      const next = this.delayUntilNextRun(sched);
      if (next !== null) {
        handle.timerId = this.setTimer(tick, next);
      } else {
        this.handles.delete(sched.id);
      }
    };

    const timerId = this.setTimer(tick, delay);
    this.handles.set(sched.id, {
      scheduleId: sched.id, timerId,
      scheduleConfig: sched, reportConfig: report,
    });
    return sched.id;
  }

  /** Fire a schedule immediately, bypassing the timer (for manual triggers). */
  async runOnce(
    report: ReportConfig,
    sched: ScheduleConfig,
    format: ReportFormat
  ): Promise<ReportRunResult> {
    const result = await generateReport(report, this.engine, format);
    for (const d of this.deliverers) {
      try { await d.deliver(result, sched); }
      catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[ScheduleRunner] deliverer ${d.id} failed:`, err);
      }
    }
    sched.lastRunAt = this.now();
    sched.runCount  = (sched.runCount ?? 0) + 1;
    this.engine.eventBus.emit('report:schedule:fired', { scheduleId: sched.id });
    return result;
  }

  stop(scheduleId: string): void {
    const h = this.handles.get(scheduleId);
    if (h) {
      this.clearTimer(h.timerId);
      this.handles.delete(scheduleId);
    }
  }

  stopAll(): void {
    for (const h of this.handles.values()) this.clearTimer(h.timerId);
    this.handles.clear();
  }

  /** Count of active schedules currently armed. */
  get activeCount(): number { return this.handles.size; }

  // ── internal ──────────────────────────────────────────────────────────────

  private delayUntilNextRun(sched: ScheduleConfig): number | null {
    const now = this.now().getTime();
    switch (sched.schedule.type) {
      case 'interval':
        return Math.max(0, sched.schedule.intervalMinutes * 60_000);
      case 'once': {
        const at = sched.schedule.at.getTime();
        return at > now ? at - now : null;
      }
      case 'cron': {
        const cron = parseCronExpression(sched.schedule.expression);
        const next = nextCronDate(cron, this.now(), sched.schedule.timezone);
        return Math.max(0, next.getTime() - now);
      }
    }
  }
}
