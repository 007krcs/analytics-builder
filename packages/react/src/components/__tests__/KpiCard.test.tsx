// ─── KpiCard Tests ────────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KpiCard } from '../KpiCard';
import type { KpiConfig, KpiResult } from '@gridstorm/analytix-core';

// ── Factories ─────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<KpiConfig> = {}): KpiConfig {
  return {
    id: 'kpi-1',
    title: 'Total Revenue',
    description: 'Sum of all revenue',
    datasetId: 'ds-1',
    columnId: 'revenue',
    aggregation: 'sum',
    filters: [],
    decimals: 0,
    format: 'currency',
    prefix: '$',
    threshold: {
      warning: 5000,
      critical: 3000,
      target: 10000,
      comparisonType: 'greater_is_better',
    },
    refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
    ...overrides,
  };
}

function makeResult(overrides: Partial<KpiResult> = {}): KpiResult {
  return {
    configId: 'kpi-1',
    value: 8000,
    formatted: '$8,000',
    status: 'warning',
    rowCount: 100,
    durationMs: 5,
    computedAt: new Date('2024-01-15T10:00:00Z'),
    stale: false,
    trend: null,
    ...overrides,
  } as KpiResult;
}

describe('KpiCard', () => {
  // ── Title ──────────────────────────────────────────────────────────────────

  it('renders the KPI title', () => {
    render(<KpiCard config={makeConfig()} result={makeResult()} />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<KpiCard config={makeConfig({ title: 'Net Profit' })} result={makeResult()} />);
    expect(screen.getByText('Net Profit')).toBeInTheDocument();
  });

  // ── Value ──────────────────────────────────────────────────────────────────

  it('renders the formatted value', () => {
    render(<KpiCard config={makeConfig()} result={makeResult({ formatted: '$8,000' })} />);
    expect(screen.getByText('$8,000')).toBeInTheDocument();
  });

  it('renders a null result gracefully (no crash)', () => {
    expect(() =>
      render(<KpiCard config={makeConfig()} result={null} />)
    ).not.toThrow();
  });

  // ── Description ───────────────────────────────────────────────────────────

  it('renders description when present in config', () => {
    render(<KpiCard config={makeConfig()} result={makeResult()} />);
    expect(screen.getByText('Sum of all revenue')).toBeInTheDocument();
  });

  it('does NOT render description when config.description is absent', () => {
    const cfg = makeConfig({ description: undefined });
    render(<KpiCard config={cfg} result={makeResult()} />);
    expect(screen.queryByText('Sum of all revenue')).not.toBeInTheDocument();
  });

  // ── Status color (borderLeftColor) ────────────────────────────────────────

  it('good status applies green borderLeftColor (#22c55e)', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult({ status: 'good' })} />
    );
    const card = container.querySelector('.kpi-card') as HTMLElement;
    expect(card?.style.borderLeftColor).toBe('#22c55e');
  });

  it('warning status applies yellow borderLeftColor (#f59e0b)', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult({ status: 'warning' })} />
    );
    const card = container.querySelector('.kpi-card') as HTMLElement;
    expect(card?.style.borderLeftColor).toBe('#f59e0b');
  });

  it('critical status applies red borderLeftColor (#ef4444)', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult({ status: 'critical' })} />
    );
    const card = container.querySelector('.kpi-card') as HTMLElement;
    expect(card?.style.borderLeftColor).toBe('#ef4444');
  });

  it('neutral status applies gray borderLeftColor (#6b7280)', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult({ status: 'neutral' })} />
    );
    const card = container.querySelector('.kpi-card') as HTMLElement;
    expect(card?.style.borderLeftColor).toBe('#6b7280');
  });

  // ── Accessible aria-label ─────────────────────────────────────────────────

  it('has aria-label containing title and formatted value', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult({ formatted: '$8,000' })} />
    );
    const card = container.querySelector('[aria-label]');
    expect(card?.getAttribute('aria-label')).toContain('Total Revenue');
    expect(card?.getAttribute('aria-label')).toContain('$8,000');
  });

  it('aria-label shows "loading" when result is null', () => {
    const { container } = render(<KpiCard config={makeConfig()} result={null} />);
    const card = container.querySelector('[aria-label]');
    expect(card?.getAttribute('aria-label')).toContain('loading');
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('shows skeleton when loading=true and result=null', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={null} loading={true} />
    );
    expect(container.querySelector('.kpi-card-skeleton')).toBeInTheDocument();
  });

  it('does NOT show skeleton when loading=false', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={null} loading={false} />
    );
    expect(container.querySelector('.kpi-card-skeleton')).not.toBeInTheDocument();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it('shows "Error loading KPI" when error is provided', () => {
    render(
      <KpiCard config={makeConfig()} result={null} error={new Error('fetch failed')} />
    );
    expect(screen.getByText('Error loading KPI')).toBeInTheDocument();
  });

  it('error element has title with error message', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={null} error={new Error('timeout')} />
    );
    const errEl = container.querySelector('.kpi-card-error');
    expect(errEl?.getAttribute('title')).toBe('timeout');
  });

  // ── onRefresh button ──────────────────────────────────────────────────────

  it('shows Refresh button when onRefresh is provided', () => {
    render(<KpiCard config={makeConfig()} result={makeResult()} onRefresh={() => {}} />);
    expect(screen.getByTitle('Refresh')).toBeInTheDocument();
  });

  it('does NOT show Refresh button when onRefresh is not provided', () => {
    render(<KpiCard config={makeConfig()} result={makeResult()} />);
    expect(screen.queryByTitle('Refresh')).not.toBeInTheDocument();
  });

  it('Refresh button calls onRefresh when clicked', () => {
    const onRefresh = vi.fn();
    render(<KpiCard config={makeConfig()} result={makeResult()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByTitle('Refresh'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('Refresh button is disabled when loading=true', () => {
    render(
      <KpiCard
        config={makeConfig()}
        result={makeResult()}
        loading={true}
        onRefresh={() => {}}
      />
    );
    const btn = screen.getByTitle('Refresh') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  // ── Size variants (CSS class) ─────────────────────────────────────────────

  it('applies kpi-card--small class for size="small"', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult()} size="small" />
    );
    expect(container.querySelector('.kpi-card--small')).toBeInTheDocument();
  });

  it('applies kpi-card--medium class by default', () => {
    const { container } = render(<KpiCard config={makeConfig()} result={makeResult()} />);
    expect(container.querySelector('.kpi-card--medium')).toBeInTheDocument();
  });

  it('applies kpi-card--large class for size="large"', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult()} size="large" />
    );
    expect(container.querySelector('.kpi-card--large')).toBeInTheDocument();
  });

  // ── Variant class ─────────────────────────────────────────────────────────

  it('applies kpi-card--compact class for variant="compact"', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult()} variant="compact" />
    );
    expect(container.querySelector('.kpi-card--compact')).toBeInTheDocument();
  });

  // ── Footer ────────────────────────────────────────────────────────────────

  it('shows footer row count and duration when size is not small', () => {
    render(
      <KpiCard config={makeConfig()} result={makeResult({ rowCount: 100, durationMs: 5 })} size="medium" />
    );
    expect(screen.getByText(/100 rows/)).toBeInTheDocument();
  });

  it('does NOT show footer when size is "small"', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult()} size="small" />
    );
    expect(container.querySelector('.kpi-card-footer')).not.toBeInTheDocument();
  });

  // ── Status dot ────────────────────────────────────────────────────────────

  it('status dot has correct background for "good"', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult({ status: 'good' })} />
    );
    const dot = container.querySelector('.kpi-card-status-dot') as HTMLElement;
    expect(dot?.style.backgroundColor).toBe('#22c55e');
  });

  // ── Custom className ──────────────────────────────────────────────────────

  it('applies custom className to root div', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult()} className="my-kpi" />
    );
    expect(container.querySelector('.kpi-card.my-kpi')).toBeInTheDocument();
  });

  // ── Stale indicator ───────────────────────────────────────────────────────

  it('shows "Refreshing..." when result.stale is true', () => {
    render(<KpiCard config={makeConfig()} result={makeResult({ stale: true })} />);
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  });

  it('does NOT show "Refreshing..." when result.stale is false', () => {
    render(<KpiCard config={makeConfig()} result={makeResult({ stale: false })} />);
    expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
  });

  // ── Snapshot delta (previousPeriodValue) ──────────────────────────────────

  it('shows snapshot delta when previousPeriodValue is provided', () => {
    const { container } = render(
      <KpiCard
        config={makeConfig()}
        result={makeResult({ value: 12000, trend: null })}
        previousPeriodValue={10000}
      />
    );
    // +20.0% increase
    expect(container.querySelector('.kpi-card-delta')).toBeInTheDocument();
    expect(screen.getByText(/\+20\.0%/)).toBeInTheDocument();
  });

  it('does NOT show snapshot delta when previousPeriodValue is null', () => {
    const { container } = render(
      <KpiCard config={makeConfig()} result={makeResult()} previousPeriodValue={null} />
    );
    expect(container.querySelector('.kpi-card-delta')).not.toBeInTheDocument();
  });
});
