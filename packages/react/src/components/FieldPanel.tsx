/**
 * FieldPanel — Shows the available dataset columns as draggable field items.
 * Users drag fields from here into the DropZone targets.
 */

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Column, Dataset } from '@analytix/core';

// ─── DraggableField ──────────────────────────────────────────────────────────

interface DraggableFieldProps {
  column: Column;
}

function DraggableField({ column }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `field-${column.id}`,
    data: { type: 'field', column },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  const typeColor: Record<string, string> = {
    number: '#6366f1',
    integer: '#6366f1',
    float: '#6366f1',
    currency: '#22c55e',
    percentage: '#22c55e',
    string: '#f59e0b',
    boolean: '#ec4899',
    date: '#3b82f6',
    datetime: '#3b82f6',
    time: '#3b82f6',
  };

  const color = typeColor[column.type] ?? '#6b7280';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="field-item"
      title={`${column.displayName} (${column.type})`}
    >
      <span
        className="field-type-badge"
        style={{ backgroundColor: color }}
      >
        {getTypeLabel(column.type)}
      </span>
      <span className="field-name">{column.displayName}</span>
    </div>
  );
}

function getTypeLabel(type: Column['type']): string {
  const labels: Record<string, string> = {
    number: '#', integer: '#', float: '#',
    currency: '$', percentage: '%',
    string: 'A', boolean: '✓',
    date: '📅', datetime: '📅', time: '⏰',
  };
  return labels[type] ?? '?';
}

// ─── FieldPanel ──────────────────────────────────────────────────────────────

export interface FieldPanelProps {
  dataset: Dataset | null;
  /** Search query to filter fields */
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  className?: string;
}

export function FieldPanel({
  dataset,
  searchQuery = '',
  onSearchChange,
  className,
}: FieldPanelProps) {
  const dimensionCols = (dataset?.columns ?? []).filter(
    (c) => c.dimensional && matchSearch(c, searchQuery)
  );
  const measureCols = (dataset?.columns ?? []).filter(
    (c) => c.aggregatable && matchSearch(c, searchQuery)
  );

  return (
    <div className={`field-panel ${className ?? ''}`.trim()}>
      <div className="field-panel-header">
        <span className="field-panel-title">Fields</span>
        {dataset && (
          <span className="field-panel-meta">
            {dataset.source.rowCount.toLocaleString()} rows
          </span>
        )}
      </div>

      {onSearchChange && (
        <div className="field-panel-search">
          <input
            type="text"
            placeholder="Search fields..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="field-search-input"
          />
        </div>
      )}

      {!dataset ? (
        <div className="field-panel-empty">
          <p>No dataset loaded</p>
          <p className="field-panel-hint">Load a dataset to see available fields</p>
        </div>
      ) : (
        <>
          {dimensionCols.length > 0 && (
            <FieldGroup label="Dimensions" columns={dimensionCols} />
          )}
          {measureCols.length > 0 && (
            <FieldGroup label="Measures" columns={measureCols} />
          )}
          {dimensionCols.length === 0 && measureCols.length === 0 && (
            <div className="field-panel-empty">
              <p>No fields match "{searchQuery}"</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface FieldGroupProps {
  label: string;
  columns: Column[];
}

function FieldGroup({ label, columns }: FieldGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="field-group">
      <button
        className="field-group-header"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span className="field-group-label">{label}</span>
        <span className="field-group-count">{columns.length}</span>
        <span className="field-group-chevron">{collapsed ? '▶' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="field-group-items">
          {columns.map((col) => (
            <DraggableField key={col.id} column={col} />
          ))}
        </div>
      )}
    </div>
  );
}

function matchSearch(col: Column, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    col.displayName.toLowerCase().includes(q) ||
    col.id.toLowerCase().includes(q) ||
    col.type.toLowerCase().includes(q)
  );
}
