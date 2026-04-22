// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * KpiCard — Displays a single computed KPI with value, status, trend,
 * and period-over-period delta when previousPeriod is configured.
 */

import type { KpiResult, KpiConfig } from '@gridstorm/analytix-core';

export interface KpiCardProps {
  config: KpiConfig;
  result: KpiResult | null;
  loading?: boolean;
  error?: Error | null;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'progress';
  onRefresh?: () => void;
  className?: string;
  /** Optional previous-period value for snapshot delta display */
  previousPeriodValue?: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  good: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  neutral: '#6b7280',
};

const TREND_ICONS: Record<string, string> = {
  up: '▲',
  down: '▼',
  flat: '–',
};

export function KpiCard({
  config,
  result,
  loading = false,
  error = null,
  size = 'medium',
  variant = 'default',
  onRefresh,
  className,
  previousPeriodValue,
}: KpiCardProps) {
  const status = result?.status ?? 'neutral';
  const statusColor = STATUS_COLORS[status];
  const trend = result?.trend;

  // Compute snapshot delta from previousPeriodValue prop
  const snapshotDelta: { pct: number; isUp: boolean; color: string } | null = (() => {
    if (previousPeriodValue == null || result?.value == null) return null;
    const prev = previousPeriodValue;
    if (prev === 0) return null;
    const pct = ((result.value - prev) / Math.abs(prev)) * 100;
    const isUp = pct >= 0;
    const greaterIsBetter = config.threshold?.comparisonType !== 'lower_is_better';
    const positive = greaterIsBetter ? isUp : !isUp;
    return {
      pct,
      isUp,
      color: positive ? STATUS_COLORS.good : STATUS_COLORS.critical,
    };
  })();

  const trendColor =
    trend
      ? config.threshold?.comparisonType === 'lower_is_better'
        ? trend.direction === 'up' ? STATUS_COLORS.critical : STATUS_COLORS.good
        : trend.direction === 'up' ? STATUS_COLORS.good : STATUS_COLORS.critical
      : undefined;

  return (
    <div
      className={`kpi-card kpi-card--${size} kpi-card--${variant} kpi-card--${status} ${className ?? ''}`.trim()}
      style={{ borderLeftColor: statusColor }}
      aria-label={`${config.title}: ${result?.formatted ?? 'loading'}`}
    >
      {/* Header */}
      <div className="kpi-card-header">
        <span className="kpi-card-title">{config.title}</span>
        <div className="kpi-card-actions">
          <span
            className={`kpi-card-status-dot`}
            style={{ backgroundColor: statusColor }}
            title={`Status: ${status}`}
          />
          {onRefresh && (
            <button
              className="kpi-card-refresh-btn"
              onClick={onRefresh}
              title="Refresh"
              disabled={loading}
            >
              {loading ? '⟳' : '↺'}
            </button>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="kpi-card-body">
        {loading && !result && (
          <div className="kpi-card-skeleton">
            <div className="kpi-skeleton-value" />
          </div>
        )}
        {error && (
          <div className="kpi-card-error" title={error.message}>
            Error loading KPI
          </div>
        )}
        {result && (
          <>
            <div className="kpi-card-value" style={{ opacity: loading ? 0.5 : 1 }}>
              {result.formatted}
            </div>

            {config.description && (
              <div className="kpi-card-description">{config.description}</div>
            )}

            {trend && (
              <div
                className="kpi-card-trend"
                style={{ color: trendColor }}
                title={trend.periodLabel}
              >
                <span className="kpi-trend-icon">
                  {TREND_ICONS[trend.direction]}
                </span>
                <span className="kpi-trend-value">
                  {trend.percentageChange > 0 ? '+' : ''}{trend.percentageChange.toFixed(1)}%
                </span>
                <span className="kpi-trend-label">{trend.periodLabel}</span>
              </div>
            )}

            {/* Snapshot delta — period-over-period percentage change */}
            {snapshotDelta != null && !trend && (
              <div
                className="kpi-card-delta"
                style={{ color: snapshotDelta.color }}
                aria-label={`Period-over-period change: ${snapshotDelta.pct >= 0 ? '+' : ''}${snapshotDelta.pct.toFixed(1)}%`}
                title="vs. previous period"
              >
                <span className="kpi-delta-arrow" aria-hidden="true">
                  {snapshotDelta.isUp ? '▲' : '▼'}
                </span>
                <span className="kpi-delta-pct">
                  {snapshotDelta.pct >= 0 ? '+' : ''}{snapshotDelta.pct.toFixed(1)}%
                </span>
                <span className="kpi-delta-label">vs. prev period</span>
              </div>
            )}

            {variant === 'progress' && config.threshold?.target !== undefined && (
              <ProgressBar
                value={result.value ?? 0}
                target={config.threshold.target}
                color={statusColor}
              />
            )}

            {result.stale && (
              <div className="kpi-card-stale">Refreshing...</div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {result && size !== 'small' && (
        <div className="kpi-card-footer">
          <span className="kpi-card-meta">
            {result.rowCount.toLocaleString()} rows · {result.durationMs.toFixed(0)}ms
          </span>
          <span className="kpi-card-timestamp">
            {result.computedAt.toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  target: number;
  color: string;
}

function ProgressBar({ value, target, color }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / target) * 100));
  return (
    <div className="kpi-progress-wrapper">
      <div className="kpi-progress-bar">
        <div
          className="kpi-progress-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="kpi-progress-labels">
        <span>{value.toLocaleString()}</span>
        <span>Target: {target.toLocaleString()}</span>
      </div>
    </div>
  );
}
