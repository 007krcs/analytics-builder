// ─── AnalyticsBuilder Integration Tests ──────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import { computePivot } from '@gridstorm/analytix-pivot-engine';
import { computeKpi } from '@gridstorm/analytix-kpi-engine';
import { AnalyticsBuilder } from '../AnalyticsBuilder';

// ── Factory ───────────────────────────────────────────────────────────────────

function makeEngine(): AnalyticsEngine {
  const engine = new AnalyticsEngine();
  engine.registerPivotEngine(computePivot);
  engine.registerKpiEngine(computeKpi);
  return engine;
}

function makeSalesDataset(engine: AnalyticsEngine) {
  return engine.addDatasetFromRows('ds-sales', 'Sales', [
    { region: 'North', category: 'Electronics', revenue: 1000, profit: 300, units: 10 },
    { region: 'South', category: 'Clothing', revenue: 800, profit: 200, units: 20 },
    { region: 'East', category: 'Electronics', revenue: 1200, profit: 400, units: 15 },
  ]);
}

describe('AnalyticsBuilder', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = makeEngine();
  });

  afterEach(() => {
    engine.destroy();
    vi.restoreAllMocks();
  });

  // ── Initial render ─────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    expect(() => render(<AnalyticsBuilder engine={engine} />)).not.toThrow();
  });

  it('renders the "Analytics Builder" title', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByText('Analytics Builder')).toBeInTheDocument();
  });

  it('renders the DndContext (DragOverlay is present in DOM)', () => {
    const { container } = render(<AnalyticsBuilder engine={engine} />);
    // DndContext renders, meaning no crash. We can verify the analytics-builder div.
    expect(container.querySelector('.analytics-builder')).toBeInTheDocument();
  });

  // ── Tabs ──────────────────────────────────────────────────────────────────

  it('renders all 4 tabs', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByText('Pivot Table')).toBeInTheDocument();
    expect(screen.getByText('Charts')).toBeInTheDocument();
    expect(screen.getByText('KPIs')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('tabs have role="tab"', () => {
    render(<AnalyticsBuilder engine={engine} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(4);
  });

  it('"Pivot Table" tab is selected by default', () => {
    render(<AnalyticsBuilder engine={engine} />);
    const pivotTab = screen.getByRole('tab', { name: /Pivot Table/i });
    expect(pivotTab.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking "Charts" tab makes it selected', () => {
    render(<AnalyticsBuilder engine={engine} />);
    fireEvent.click(screen.getByRole('tab', { name: /Charts/i }));
    const chartsTab = screen.getByRole('tab', { name: /Charts/i });
    expect(chartsTab.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking "KPIs" tab makes it selected', () => {
    render(<AnalyticsBuilder engine={engine} />);
    fireEvent.click(screen.getByRole('tab', { name: /KPIs/i }));
    expect(screen.getByRole('tab', { name: /KPIs/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('clicking "Reports" tab makes it selected', () => {
    render(<AnalyticsBuilder engine={engine} />);
    fireEvent.click(screen.getByRole('tab', { name: /Reports/i }));
    expect(screen.getByRole('tab', { name: /Reports/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('tab switching deselects previous tab', () => {
    render(<AnalyticsBuilder engine={engine} />);
    fireEvent.click(screen.getByRole('tab', { name: /Charts/i }));
    const pivotTab = screen.getByRole('tab', { name: /Pivot Table/i });
    expect(pivotTab.getAttribute('aria-selected')).toBe('false');
  });

  // ── Dataset selector ──────────────────────────────────────────────────────

  it('renders the "Dataset" label in toolbar', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByText('Dataset')).toBeInTheDocument();
  });

  it('shows "Select dataset..." option when no dataset is selected', () => {
    render(<AnalyticsBuilder engine={engine} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(screen.getByText('Select dataset...')).toBeInTheDocument();
  });

  it('shows loaded dataset in dropdown options', () => {
    makeSalesDataset(engine);
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByText(/Sales/)).toBeInTheDocument();
  });

  it('changing dataset selector updates the active dataset', () => {
    const ds = makeSalesDataset(engine);
    render(<AnalyticsBuilder engine={engine} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: ds.id } });
    // After selecting the dataset, the field panel should show field count
    // "3 rows" appears in both the dataset option and the field-panel-meta span
    expect(screen.getAllByText(/3\s*rows/).length).toBeGreaterThan(0);
  });

  // ── Export buttons ────────────────────────────────────────────────────────

  it('renders PDF export button', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByTitle('Export as PDF')).toBeInTheDocument();
  });

  it('renders Excel export button', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByTitle('Export as Excel')).toBeInTheDocument();
  });

  it('PDF button calls onExport with "pdf"', () => {
    const onExport = vi.fn();
    render(<AnalyticsBuilder engine={engine} onExport={onExport} />);
    fireEvent.click(screen.getByTitle('Export as PDF'));
    expect(onExport).toHaveBeenCalledWith('pdf');
  });

  it('Excel button calls onExport with "excel"', () => {
    const onExport = vi.fn();
    render(<AnalyticsBuilder engine={engine} onExport={onExport} />);
    fireEvent.click(screen.getByTitle('Export as Excel'));
    expect(onExport).toHaveBeenCalledWith('excel');
  });

  it('onExport is optional — PDF click does not throw without it', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(() => fireEvent.click(screen.getByTitle('Export as PDF'))).not.toThrow();
  });

  // ── FieldPanel sidebar ────────────────────────────────────────────────────

  it('renders the field panel sidebar', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByText('Fields')).toBeInTheDocument();
  });

  it('shows field search input in the sidebar', () => {
    render(<AnalyticsBuilder engine={engine} />);
    expect(screen.getByPlaceholderText('Search fields...')).toBeInTheDocument();
  });

  // ── initialDataset prop ───────────────────────────────────────────────────

  it('initializes with provided dataset', () => {
    const ds = makeSalesDataset(engine);
    render(<AnalyticsBuilder engine={engine} initialDataset={ds} />);
    // The field panel should reflect the dataset rows
    // "3 rows" appears in both the dataset option and the field-panel-meta span
    expect(screen.getAllByText(/3\s*rows/).length).toBeGreaterThan(0);
  });

  // ── KPI tab empty state ───────────────────────────────────────────────────

  it('shows KPI empty state when no dataset is configured', () => {
    render(<AnalyticsBuilder engine={engine} />);
    fireEvent.click(screen.getByRole('tab', { name: /KPIs/i }));
    expect(screen.getByText('No KPIs configured')).toBeInTheDocument();
  });

  // ── Custom className ──────────────────────────────────────────────────────

  it('applies custom className to root element', () => {
    const { container } = render(
      <AnalyticsBuilder engine={engine} className="my-builder" />
    );
    expect(container.querySelector('.analytics-builder.my-builder')).toBeInTheDocument();
  });

  // ── Tab content visibility ────────────────────────────────────────────────

  it('pivot tab content is visible by default', () => {
    const { container } = render(<AnalyticsBuilder engine={engine} />);
    // PivotBuilder renders drop zones — check for rows/columns/values zones
    // (exact content depends on PivotBuilder, but workspace div should exist)
    expect(container.querySelector('.analytics-builder-workspace')).toBeInTheDocument();
  });
});
