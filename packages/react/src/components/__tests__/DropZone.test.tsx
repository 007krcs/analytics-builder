// ─── DropZone Tests ───────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { DropZone } from '../DropZone';
import type { DropZoneField } from '../DropZone';
import type { Column } from '@gridstorm/analytix-core';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeColumn(id: string, type: Column['type'] = 'string', aggregatable = false): Column {
  return {
    id,
    displayName: id.charAt(0).toUpperCase() + id.slice(1),
    type,
    dimensional: !aggregatable,
    aggregatable,
    nullable: false,
    unique: false,
    sampleValues: [],
  } as Column;
}

function makeField(id: string, columnId: string, type: Column['type'] = 'string', aggregatable = false): DropZoneField {
  return {
    id,
    column: makeColumn(columnId, type, aggregatable),
  };
}

// DndContext wrapper is required for @dnd-kit hooks (useDroppable, useSortable)
function wrap(ui: React.ReactElement) {
  return render(<DndContext>{ui}</DndContext>);
}

describe('DropZone', () => {
  // ── Empty state ────────────────────────────────────────────────────────────

  it('shows placeholder text when fields array is empty', () => {
    wrap(
      <DropZone
        id="rows"
        label="Rows"
        fields={[]}
        onRemove={() => {}}
      />
    );
    expect(screen.getByText('Drop rows here')).toBeInTheDocument();
  });

  it('shows custom placeholder when provided', () => {
    wrap(
      <DropZone
        id="rows"
        label="Rows"
        fields={[]}
        onRemove={() => {}}
        placeholder="Drag dimension fields here"
      />
    );
    expect(screen.getByText('Drag dimension fields here')).toBeInTheDocument();
  });

  it('does NOT show placeholder when fields are present', () => {
    wrap(
      <DropZone
        id="rows"
        label="Rows"
        fields={[makeField('f1', 'region')]}
        onRemove={() => {}}
      />
    );
    expect(screen.queryByText(/Drop rows here/i)).not.toBeInTheDocument();
  });

  // ── Label ─────────────────────────────────────────────────────────────────

  it('renders the zone label', () => {
    wrap(<DropZone id="rows" label="Row Dimensions" fields={[]} onRemove={() => {}} />);
    expect(screen.getByText('Row Dimensions')).toBeInTheDocument();
  });

  // ── Field count badge ─────────────────────────────────────────────────────

  it('shows field count as "0" when empty', () => {
    wrap(<DropZone id="rows" label="Rows" fields={[]} onRemove={() => {}} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('shows correct count when fields are present', () => {
    const fields = [makeField('f1', 'region'), makeField('f2', 'category')];
    wrap(<DropZone id="rows" label="Rows" fields={fields} onRemove={() => {}} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows count with maxFields in format "N/M"', () => {
    const fields = [makeField('f1', 'region')];
    wrap(<DropZone id="rows" label="Rows" fields={fields} maxFields={3} onRemove={() => {}} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  // ── Field chips ───────────────────────────────────────────────────────────

  it('renders one chip per field', () => {
    const fields = [
      makeField('f1', 'region'),
      makeField('f2', 'category'),
      makeField('f3', 'product'),
    ];
    wrap(<DropZone id="rows" label="Rows" fields={fields} onRemove={() => {}} />);
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Product')).toBeInTheDocument();
  });

  // ── Remove callback ───────────────────────────────────────────────────────

  it('calls onRemove with field id when × button is clicked', () => {
    const onRemove = vi.fn();
    const fields = [makeField('field-abc', 'region')];
    wrap(
      <DropZone id="rows" label="Rows" fields={fields} onRemove={onRemove} />
    );
    // Remove button has aria-label "Remove Region"
    fireEvent.click(screen.getByLabelText('Remove Region'));
    expect(onRemove).toHaveBeenCalledWith('field-abc');
  });

  it('calls onRemove once per click', () => {
    const onRemove = vi.fn();
    const fields = [makeField('f1', 'region')];
    wrap(<DropZone id="rows" label="Rows" fields={fields} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove Region'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // ── Aggregation selector (values zone) ───────────────────────────────────

  it('shows aggregation selector for value fields in "values" zone', () => {
    const fields = [makeField('f1', 'revenue', 'number', true)]; // aggregatable
    wrap(
      <DropZone
        id="values"
        label="Values"
        fields={fields}
        onRemove={() => {}}
        onAggregationChange={() => {}}
      />
    );
    // Aggregation select is present
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('does NOT show aggregation selector in "rows" zone', () => {
    const fields = [makeField('f1', 'revenue', 'number', true)];
    wrap(
      <DropZone id="rows" label="Rows" fields={fields} onRemove={() => {}} />
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('calls onAggregationChange when aggregation selector changes', () => {
    const onAggChange = vi.fn();
    const fields = [{ ...makeField('f1', 'revenue', 'number', true), aggregation: 'sum' }];
    wrap(
      <DropZone
        id="values"
        label="Values"
        fields={fields}
        onRemove={() => {}}
        onAggregationChange={onAggChange}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'avg' } });
    expect(onAggChange).toHaveBeenCalledWith('f1', 'avg');
  });

  // ── Accessibility ─────────────────────────────────────────────────────────

  it('root element has role="region"', () => {
    wrap(<DropZone id="rows" label="Rows" fields={[]} onRemove={() => {}} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('aria-label defaults to "[label] drop zone"', () => {
    wrap(<DropZone id="rows" label="Rows" fields={[]} onRemove={() => {}} />);
    expect(screen.getByRole('region', { name: 'Rows drop zone' })).toBeInTheDocument();
  });

  it('accepts custom aria-label', () => {
    wrap(
      <DropZone
        id="rows"
        label="Rows"
        fields={[]}
        onRemove={() => {}}
        aria-label="Custom region label"
      />
    );
    expect(screen.getByRole('region', { name: 'Custom region label' })).toBeInTheDocument();
  });

  // ── maxFields / full state ────────────────────────────────────────────────

  it('shows "Zone full" placeholder when fields.length equals maxFields', () => {
    // The placeholder only renders when the zone is empty (fields.length === 0).
    // To see "Zone full", use an empty zone whose maxFields is 0.
    wrap(
      <DropZone id="rows" label="Rows" fields={[]} maxFields={0} onRemove={() => {}} />
    );
    expect(screen.getByText('Zone full')).toBeInTheDocument();
  });

  it('applies drop-zone--full class when at capacity', () => {
    const fields = [makeField('f1', 'region')];
    const { container } = wrap(
      <DropZone id="rows" label="Rows" fields={fields} maxFields={1} onRemove={() => {}} />
    );
    expect(container.querySelector('.drop-zone--full')).toBeInTheDocument();
  });

  // ── Custom className ──────────────────────────────────────────────────────

  it('applies custom className to root element', () => {
    const { container } = wrap(
      <DropZone id="rows" label="Rows" fields={[]} onRemove={() => {}} className="my-zone" />
    );
    expect(container.querySelector('.drop-zone.my-zone')).toBeInTheDocument();
  });

  // ── Direction ─────────────────────────────────────────────────────────────

  it('applies drop-zone--horizontal class by default', () => {
    const { container } = wrap(
      <DropZone id="rows" label="Rows" fields={[]} onRemove={() => {}} />
    );
    expect(container.querySelector('.drop-zone--horizontal')).toBeInTheDocument();
  });

  it('applies drop-zone--vertical class when direction="vertical"', () => {
    const { container } = wrap(
      <DropZone id="rows" label="Rows" fields={[]} onRemove={() => {}} direction="vertical" />
    );
    expect(container.querySelector('.drop-zone--vertical')).toBeInTheDocument();
  });
});
