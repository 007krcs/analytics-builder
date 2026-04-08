// ─── FieldPanel Tests ─────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { FieldPanel } from '../FieldPanel';
import type { Dataset, Column } from '@gridstorm/analytix-core';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function makeDataset(columns: Column[]): Dataset {
  return {
    id: 'ds-1',
    name: 'Sales',
    columns,
    rows: [{ region: 'North', revenue: 1000 }],
    source: { rowCount: 1, fileSize: 0, format: 'json' },
    createdAt: new Date(),
  } as unknown as Dataset;
}

const DIMENSION_COL = makeColumn('region', 'string', true, false);
const MEASURE_COL = makeColumn('revenue', 'number', false, true);
const BOTH_COL = makeColumn('score', 'number', true, true);

// DndContext wrapper required for useDraggable hook inside FieldPanel
function wrap(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

describe('FieldPanel', () => {
  // ── No dataset ────────────────────────────────────────────────────────────

  it('shows "No dataset loaded" when dataset is null', () => {
    wrap(<FieldPanel dataset={null} />);
    expect(screen.getByText('No dataset loaded')).toBeInTheDocument();
  });

  it('shows hint text when dataset is null', () => {
    wrap(<FieldPanel dataset={null} />);
    expect(screen.getByText(/Load a dataset to see available fields/)).toBeInTheDocument();
  });

  it('does NOT show field list when dataset is null', () => {
    wrap(<FieldPanel dataset={null} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  // ── Header ────────────────────────────────────────────────────────────────

  it('shows "Fields" title', () => {
    wrap(<FieldPanel dataset={null} />);
    expect(screen.getByText('Fields')).toBeInTheDocument();
  });

  it('shows row count when dataset is loaded', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByText(/1 row/)).toBeInTheDocument();
  });

  // ── Dimension / Measure groups ────────────────────────────────────────────

  it('shows "Dimensions" group header for dimensional columns', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByText('Dimensions')).toBeInTheDocument();
  });

  it('shows "Measures" group header for aggregatable columns', () => {
    const ds = makeDataset([MEASURE_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByText('Measures')).toBeInTheDocument();
  });

  it('renders dimension column display name', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByText('Region')).toBeInTheDocument();
  });

  it('renders measure column display name', () => {
    const ds = makeDataset([MEASURE_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('renders both groups when dataset has both dimensional and aggregatable columns', () => {
    const ds = makeDataset([DIMENSION_COL, MEASURE_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByText('Dimensions')).toBeInTheDocument();
    expect(screen.getByText('Measures')).toBeInTheDocument();
  });

  // ── Search ────────────────────────────────────────────────────────────────

  it('shows search input when onSearchChange is provided', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} searchQuery="" onSearchChange={() => {}} />);
    expect(screen.getByPlaceholderText('Search fields...')).toBeInTheDocument();
  });

  it('does NOT show search input when onSearchChange is not provided', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.queryByPlaceholderText('Search fields...')).not.toBeInTheDocument();
  });

  it('search input has accessible aria-label', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} searchQuery="" onSearchChange={() => {}} />);
    expect(screen.getByLabelText('Search available fields')).toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', () => {
    const onSearchChange = vi.fn();
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} searchQuery="" onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByPlaceholderText('Search fields...'), {
      target: { value: 'reg' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('reg');
  });

  // ── Case-insensitive search filter ────────────────────────────────────────

  it('shows column matching search query (case-insensitive)', () => {
    const ds = makeDataset([DIMENSION_COL, MEASURE_COL]); // 'region' and 'revenue'
    wrap(<FieldPanel dataset={ds} searchQuery="REG" onSearchChange={() => {}} />);
    expect(screen.getByText('Region')).toBeInTheDocument();
  });

  it('hides columns NOT matching search query', () => {
    const ds = makeDataset([DIMENSION_COL, MEASURE_COL]);
    wrap(<FieldPanel dataset={ds} searchQuery="region" onSearchChange={() => {}} />);
    // "Revenue" should not be visible as a dimension (not dimensional), but check measures group
    expect(screen.queryByText('Measures')).not.toBeInTheDocument();
  });

  it('shows "No fields match" message when search finds nothing', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} searchQuery="zzznomatch" onSearchChange={() => {}} />);
    expect(screen.getByText(/No fields match/)).toBeInTheDocument();
  });

  it('shows query in the no-match message', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} searchQuery="xyz" onSearchChange={() => {}} />);
    expect(screen.getByText(/"xyz"/)).toBeInTheDocument();
  });

  // ── Group collapse ────────────────────────────────────────────────────────

  it('group starts expanded (shows column items)', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByText('Region')).toBeInTheDocument();
  });

  it('clicking group header collapses the group', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    fireEvent.click(screen.getByText('Dimensions').closest('button')!);
    expect(screen.queryByText('Region')).not.toBeInTheDocument();
  });

  it('clicking collapsed group header expands it again', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    const btn = screen.getByText('Dimensions').closest('button')!;
    fireEvent.click(btn); // collapse
    fireEvent.click(btn); // expand
    expect(screen.getByText('Region')).toBeInTheDocument();
  });

  it('group header has aria-expanded=true when expanded', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    const btn = screen.getByText('Dimensions').closest('button')!;
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('group header has aria-expanded=false when collapsed', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    const btn = screen.getByText('Dimensions').closest('button')!;
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  // ── Accessible field list ─────────────────────────────────────────────────

  it('field list has role="list"', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('field items have role="listitem"', () => {
    const ds = makeDataset([DIMENSION_COL]);
    wrap(<FieldPanel dataset={ds} />);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  // ── Custom className ──────────────────────────────────────────────────────

  it('applies custom className to root element', () => {
    const { container } = wrap(<FieldPanel dataset={null} className="my-panel" />);
    expect(container.querySelector('.field-panel.my-panel')).toBeInTheDocument();
  });
});
