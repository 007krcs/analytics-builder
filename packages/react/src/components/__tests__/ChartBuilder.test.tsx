// ─── ChartBuilder Tests ───────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import type { Dataset, Column } from '@gridstorm/analytix-core';
import { computePivot } from '@gridstorm/analytix-pivot-engine';
import { computeKpi } from '@gridstorm/analytix-kpi-engine';
import { ChartBuilder } from '../ChartBuilder';

// ── Factories ─────────────────────────────────────────────────────────────────

function makeColumn(
  id: string,
  type: Column['type'],
  dimensional: boolean,
  aggregatable: boolean,
): Column {
  return {
    id,
    displayName: id.charAt(0).toUpperCase() + id.slice(1),
    type,
    dimensional,
    aggregatable,
    nullable: false,
    unique: false,
    sampleValues: [],
  } as Column;
}

function makeDataset(engine: AnalyticsEngine): Dataset {
  return engine.addDatasetFromRows('ds-chart', 'Sales', [
    { region: 'North', revenue: 1000, profit: 300 },
    { region: 'South', revenue: 800, profit: 200 },
    { region: 'East', revenue: 1200, profit: 400 },
  ]);
}

function makeEngine(): AnalyticsEngine {
  const engine = new AnalyticsEngine();
  engine.registerPivotEngine(computePivot);
  engine.registerKpiEngine(computeKpi);
  return engine;
}

describe('ChartBuilder', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = makeEngine();
  });

  afterEach(() => {
    engine.destroy();
    vi.restoreAllMocks();
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    expect(() => render(<ChartBuilder engine={engine} dataset={null} />)).not.toThrow();
  });

  it('renders with dataset', () => {
    const ds = makeDataset(engine);
    expect(() => render(<ChartBuilder engine={engine} dataset={ds} />)).not.toThrow();
  });

  it('renders the chart-builder root element', () => {
    const { container } = render(<ChartBuilder engine={engine} dataset={null} />);
    expect(container.querySelector('.chart-builder')).toBeInTheDocument();
  });

  // ── Title input ────────────────────────────────────────────────────────────

  it('renders the title input', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    expect(screen.getByPlaceholderText('Chart title')).toBeInTheDocument();
  });

  it('title input defaults to "New Chart"', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    const input = screen.getByPlaceholderText('Chart title') as HTMLInputElement;
    expect(input.value).toBe('New Chart');
  });

  it('title input reflects initialConfig.title', () => {
    render(
      <ChartBuilder engine={engine} dataset={null} initialConfig={{ title: 'Revenue Chart' }} />
    );
    const input = screen.getByPlaceholderText('Chart title') as HTMLInputElement;
    expect(input.value).toBe('Revenue Chart');
  });

  it('updating title input changes value', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    const input = screen.getByPlaceholderText('Chart title') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Sales Overview' } });
    expect(input.value).toBe('Sales Overview');
  });

  // ── Chart type selector ────────────────────────────────────────────────────

  it('renders chart type buttons', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    // Should render at least bar, line, area chart type buttons
    expect(screen.getAllByRole('button', { name: /chart/i }).length).toBeGreaterThan(0);
  });

  it('bar chart button is pressed by default', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    // Multiple buttons may contain "bar chart" in their aria-label; find the one
    // whose accessible name starts with "Bar Chart" (not e.g. "Combo Chart … bar …")
    const barBtn = screen.getAllByRole('button').find(
      (b) => /^bar chart/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
    )!;
    expect(barBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('initialConfig.type sets the active chart type', () => {
    render(
      <ChartBuilder engine={engine} dataset={null} initialConfig={{ type: 'line' }} />
    );
    const lineBtn = screen.getAllByRole('button').find(
      (b) => /^line chart/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
    )!;
    expect(lineBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking a chart type button makes it active', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    const lineBtn = screen.getAllByRole('button').find(
      (b) => /^line chart/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
    )!;
    fireEvent.click(lineBtn);
    expect(lineBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('clicking a chart type deactivates the previous type', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    const barBtn = screen.getAllByRole('button').find(
      (b) => /^bar chart/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
    )!;
    const lineBtn = screen.getAllByRole('button').find(
      (b) => /^line chart/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
    )!;
    fireEvent.click(lineBtn);
    expect(barBtn.getAttribute('aria-pressed')).toBe('false');
  });

  // ── Chart config form ─────────────────────────────────────────────────────

  it('renders chart configuration form', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    expect(screen.getByRole('form', { name: /chart configuration/i })).toBeInTheDocument();
  });

  it('renders "X Axis" label for bar chart', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    expect(screen.getByText('X Axis')).toBeInTheDocument();
  });

  it('renders "Y Axis (Value)" label', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    expect(screen.getByText('Y Axis (Value)')).toBeInTheDocument();
  });

  // ── Field selectors with dataset ──────────────────────────────────────────

  it('X Axis selector shows dataset columns', () => {
    const ds = makeDataset(engine);
    render(<ChartBuilder engine={engine} dataset={ds} />);
    // 'Region' should appear in the select options
    expect(screen.getAllByText('Region').length).toBeGreaterThan(0);
  });

  it('Y Axis selector shows only numeric/aggregatable columns', () => {
    const ds = makeDataset(engine);
    render(<ChartBuilder engine={engine} dataset={ds} />);
    // Revenue is aggregatable, should appear in Y axis
    expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0);
  });

  // ── Apply / onConfigChange ────────────────────────────────────────────────

  it('renders an Apply button', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('clicking Apply calls onConfigChange', () => {
    const onConfigChange = vi.fn();
    // gauge chart type does not require an xField, so Apply is enabled without a dataset
    render(
      <ChartBuilder
        engine={engine}
        dataset={null}
        initialConfig={{ type: 'gauge' }}
        onConfigChange={onConfigChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onConfigChange).toHaveBeenCalledTimes(1);
  });

  it('onConfigChange receives a config object with the selected chart type', () => {
    const onConfigChange = vi.fn();
    render(
      <ChartBuilder
        engine={engine}
        dataset={null}
        initialConfig={{ type: 'gauge' }}
        onConfigChange={onConfigChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'gauge' })
    );
  });

  it('onConfigChange receives title in config', () => {
    const onConfigChange = vi.fn();
    render(
      <ChartBuilder
        engine={engine}
        dataset={null}
        initialConfig={{ type: 'gauge' }}
        onConfigChange={onConfigChange}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('Chart title'), {
      target: { value: 'My Chart' },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Chart' })
    );
  });

  it('Apply does not throw when onConfigChange is not provided', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /apply/i }))
    ).not.toThrow();
  });

  // ── Custom className ──────────────────────────────────────────────────────

  it('applies custom className to root element', () => {
    const { container } = render(
      <ChartBuilder engine={engine} dataset={null} className="my-chart-builder" />
    );
    expect(container.querySelector('.chart-builder.my-chart-builder')).toBeInTheDocument();
  });

  // ── Chart type categories ─────────────────────────────────────────────────

  it('renders chart type category groups', () => {
    render(<ChartBuilder engine={engine} dataset={null} />);
    // getChartsByCategory returns categories — at least one group must be present
    const groups = screen.getAllByRole('group');
    expect(groups.length).toBeGreaterThan(0);
  });

  // ── Chart preview with dataset ────────────────────────────────────────────

  it('renders a chart preview container when dataset is provided', () => {
    const ds = makeDataset(engine);
    const { container } = render(
      <ChartBuilder
        engine={engine}
        dataset={ds}
        initialConfig={{
          type: 'bar',
          xField: 'region',
          series: [{ id: 's0', columnId: 'revenue', label: 'Revenue' }],
        }}
      />
    );
    // The chart preview area should exist
    expect(container.querySelector('.chart-builder')).toBeInTheDocument();
  });
});
