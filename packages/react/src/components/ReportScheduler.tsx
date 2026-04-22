// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * ReportScheduler — UI for configuring report schedules.
 * Supports interval, cron, and one-time schedule types.
 */

import { useState } from 'react';
import type {
  ReportConfig,
  ScheduleConfig,
  ScheduleDefinition,
  ReportFormat,
  ReportDelivery,
} from '@gridstorm/analytix-core';
import { parseCronExpression, nextCronDate } from '@gridstorm/analytix-kpi-engine';

export interface ReportSchedulerProps {
  report: ReportConfig;
  onAddSchedule: (schedule: ScheduleConfig) => void;
  onRemoveSchedule: (scheduleId: string) => void;
  onToggleSchedule: (scheduleId: string, enabled: boolean) => void;
  className?: string;
}

const FORMAT_OPTIONS: { value: ReportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel (CSV)' },
  { value: 'html', label: 'HTML' },
  { value: 'csv', label: 'CSV' },
];

type ScheduleType = 'interval' | 'cron' | 'once';

export function ReportScheduler({
  report,
  onAddSchedule,
  onRemoveSchedule,
  onToggleSchedule,
  className,
}: ReportSchedulerProps) {
  const [scheduleType, setScheduleType] = useState<ScheduleType>('interval');
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [cronExpression, setCronExpression] = useState('0 8 * * 1-5');
  const [timezone, setTimezone] = useState('UTC');
  const [onceDatetime, setOnceDatetime] = useState('');
  const [formats, setFormats] = useState<ReportFormat[]>(['pdf']);
  const [emailTo, setEmailTo] = useState('');
  const [cronError, setCronError] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);

  const validateCron = (expr: string) => {
    try {
      const parsed = parseCronExpression(expr);
      const next = nextCronDate(parsed, new Date(), timezone);
      setNextRun(next.toLocaleString());
      setCronError(null);
    } catch (e) {
      setCronError(e instanceof Error ? e.message : 'Invalid cron');
      setNextRun(null);
    }
  };

  const toggleFormat = (fmt: ReportFormat) => {
    setFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    );
  };

  const handleAdd = () => {
    let scheduleDef: ScheduleDefinition;

    if (scheduleType === 'interval') {
      scheduleDef = { type: 'interval', intervalMinutes };
    } else if (scheduleType === 'cron') {
      if (cronError) return;
      scheduleDef = { type: 'cron', expression: cronExpression, timezone };
    } else {
      if (!onceDatetime) return;
      scheduleDef = { type: 'once', at: new Date(onceDatetime) };
    }

    const delivery: ReportDelivery = {};
    if (emailTo.trim()) {
      delivery.emailTo = emailTo.split(',').map((e) => e.trim()).filter(Boolean);
    }

    const schedule: ScheduleConfig = {
      id: `schedule-${Date.now()}`,
      name: buildScheduleName(scheduleType, intervalMinutes, cronExpression, onceDatetime),
      enabled: true,
      schedule: scheduleDef,
      formats: formats.length > 0 ? formats : ['pdf'],
      delivery,
      runCount: 0,
    };

    onAddSchedule(schedule);
  };

  return (
    <div className={`report-scheduler ${className ?? ''}`.trim()}>
      <h3 className="report-scheduler-title">Report Schedules</h3>

      {/* Existing schedules */}
      {report.schedules.length > 0 && (
        <div className="schedule-list">
          {report.schedules.map((s) => (
            <ScheduleRow
              key={s.id}
              schedule={s}
              onRemove={() => onRemoveSchedule(s.id)}
              onToggle={(enabled) => onToggleSchedule(s.id, enabled)}
            />
          ))}
        </div>
      )}

      {report.schedules.length === 0 && (
        <div className="schedule-empty">No schedules configured.</div>
      )}

      {/* Add schedule form */}
      <div className="schedule-form">
        <h4 className="schedule-form-title">Add Schedule</h4>

        {/* Schedule type */}
        <div className="schedule-field">
          <label className="schedule-label">Schedule type</label>
          <div className="schedule-type-tabs">
            {(['interval', 'cron', 'once'] as ScheduleType[]).map((t) => (
              <button
                key={t}
                className={`schedule-type-tab ${scheduleType === t ? 'schedule-type-tab--active' : ''}`}
                onClick={() => setScheduleType(t)}
              >
                {t === 'interval' ? 'Interval' : t === 'cron' ? 'Cron' : 'One-time'}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule-specific fields */}
        {scheduleType === 'interval' && (
          <div className="schedule-field">
            <label className="schedule-label">Every (minutes)</label>
            <input
              type="number"
              className="schedule-input"
              value={intervalMinutes}
              min={1}
              onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 60))}
            />
            <span className="schedule-hint">
              ≈ {formatInterval(intervalMinutes)}
            </span>
          </div>
        )}

        {scheduleType === 'cron' && (
          <div className="schedule-field">
            <label className="schedule-label">Cron expression</label>
            <input
              type="text"
              className={`schedule-input schedule-input--code ${cronError ? 'schedule-input--error' : ''}`}
              value={cronExpression}
              onChange={(e) => {
                setCronExpression(e.target.value);
                validateCron(e.target.value);
              }}
              placeholder="0 8 * * 1-5"
            />
            {cronError && <div className="schedule-error">{cronError}</div>}
            {nextRun && <div className="schedule-hint">Next run: {nextRun}</div>}
            <div className="schedule-field">
              <label className="schedule-label">Timezone</label>
              <input
                type="text"
                className="schedule-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="UTC"
              />
            </div>
          </div>
        )}

        {scheduleType === 'once' && (
          <div className="schedule-field">
            <label className="schedule-label">Run at</label>
            <input
              type="datetime-local"
              className="schedule-input"
              value={onceDatetime}
              onChange={(e) => setOnceDatetime(e.target.value)}
            />
          </div>
        )}

        {/* Formats */}
        <div className="schedule-field">
          <label className="schedule-label">Formats</label>
          <div className="schedule-formats">
            {FORMAT_OPTIONS.map(({ value, label }) => (
              <label key={value} className="schedule-format-option">
                <input
                  type="checkbox"
                  checked={formats.includes(value)}
                  onChange={() => toggleFormat(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Email delivery */}
        <div className="schedule-field">
          <label className="schedule-label">Email to (optional, comma-separated)</label>
          <input
            type="text"
            className="schedule-input"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="user@example.com, user2@example.com"
          />
        </div>

        <button
          className="schedule-add-btn"
          onClick={handleAdd}
          disabled={scheduleType === 'cron' && !!cronError}
        >
          Add Schedule
        </button>
      </div>
    </div>
  );
}

// ─── ScheduleRow ─────────────────────────────────────────────────────────────

interface ScheduleRowProps {
  schedule: ScheduleConfig;
  onRemove: () => void;
  onToggle: (enabled: boolean) => void;
}

function ScheduleRow({ schedule, onRemove, onToggle }: ScheduleRowProps) {
  return (
    <div className={`schedule-row ${schedule.enabled ? '' : 'schedule-row--disabled'}`}>
      <div className="schedule-row-info">
        <span className="schedule-row-name">{schedule.name}</span>
        <span className="schedule-row-formats">
          {schedule.formats.map((f) => (
            <span key={f} className="schedule-format-badge">{f.toUpperCase()}</span>
          ))}
        </span>
        <span className="schedule-row-meta">
          Runs: {schedule.runCount}
          {schedule.lastRunAt && ` · Last: ${schedule.lastRunAt.toLocaleString()}`}
          {schedule.nextRunAt && ` · Next: ${schedule.nextRunAt.toLocaleString()}`}
        </span>
      </div>
      <div className="schedule-row-actions">
        <label className="schedule-toggle">
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          {schedule.enabled ? 'Active' : 'Paused'}
        </label>
        <button className="schedule-remove-btn" onClick={onRemove} title="Remove">
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hrs`;
  return `${(minutes / 1440).toFixed(1)} days`;
}

function buildScheduleName(
  type: ScheduleType,
  intervalMinutes: number,
  cronExpr: string,
  onceAt: string
): string {
  if (type === 'interval') return `Every ${formatInterval(intervalMinutes)}`;
  if (type === 'cron') return `Cron: ${cronExpr}`;
  if (onceAt) return `Once: ${new Date(onceAt).toLocaleString()}`;
  return 'One-time schedule';
}
