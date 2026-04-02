/**
 * DropZone — A droppable target for fields in the pivot builder.
 * Renders the list of fields currently assigned to a zone (rows/columns/values)
 * and accepts new fields dragged from FieldPanel.
 */

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Column } from '@gridstorm/analytix-core';

export type DropZoneRole = 'rows' | 'columns' | 'values' | 'filters';

export interface DropZoneField {
  id: string;
  column: Column;
  aggregation?: string;
}

// ─── SortableFieldChip ───────────────────────────────────────────────────────

interface FieldChipProps {
  field: DropZoneField;
  onRemove: (id: string) => void;
  showAggregation?: boolean;
  onAggregationChange?: (id: string, agg: string) => void;
}

const AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max', 'countDistinct', 'median'];

function SortableFieldChip({
  field,
  onRemove,
  showAggregation,
  onAggregationChange,
}: FieldChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`field-chip ${isDragging ? 'field-chip--dragging' : ''}`}
      {...attributes}
    >
      <span className="field-chip-drag" {...listeners}>⠿</span>
      <span className="field-chip-name">{field.column.displayName}</span>

      {showAggregation && onAggregationChange && (
        <select
          className="field-chip-agg"
          value={field.aggregation ?? 'sum'}
          onChange={(e) => onAggregationChange(field.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          {AGGREGATIONS.map((agg) => (
            <option key={agg} value={agg}>{agg}</option>
          ))}
        </select>
      )}

      <button
        className="field-chip-remove"
        onClick={() => onRemove(field.id)}
        aria-label={`Remove ${field.column.displayName}`}
      >
        ×
      </button>
    </div>
  );
}

// ─── DropZone ────────────────────────────────────────────────────────────────

export interface DropZoneProps {
  id: DropZoneRole;
  label: string;
  fields: DropZoneField[];
  onRemove: (fieldId: string) => void;
  onAggregationChange?: (fieldId: string, agg: string) => void;
  /** Max allowed fields (undefined = unlimited) */
  maxFields?: number;
  direction?: 'horizontal' | 'vertical';
  placeholder?: string;
  className?: string;
  /** WCAG 2.1 AA: accessible label for screen readers */
  'aria-label'?: string;
}

export function DropZone({
  id,
  label,
  fields,
  onRemove,
  onAggregationChange,
  maxFields,
  direction = 'horizontal',
  placeholder,
  className,
  'aria-label': ariaLabel,
}: DropZoneProps) {
  const isFull = maxFields !== undefined && fields.length >= maxFields;

  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone-${id}`,
    disabled: isFull,
    data: { type: 'dropzone', role: id },
  });

  const fieldIds = fields.map((f) => f.id);
  const strategy =
    direction === 'horizontal'
      ? horizontalListSortingStrategy
      : verticalListSortingStrategy;

  return (
    <div
      className={`drop-zone drop-zone--${direction} ${isOver ? 'drop-zone--over' : ''} ${isFull ? 'drop-zone--full' : ''} ${className ?? ''}`.trim()}
      role="region"
      aria-label={ariaLabel ?? `${label} drop zone`}
    >
      <div className="drop-zone-header">
        <span className="drop-zone-label">{label}</span>
        <span className="drop-zone-count">{fields.length}{maxFields ? `/${maxFields}` : ''}</span>
      </div>

      <div ref={setNodeRef} className="drop-zone-content">
        <SortableContext items={fieldIds} strategy={strategy}>
          {fields.map((field) => (
            <SortableFieldChip
              key={field.id}
              field={field}
              onRemove={onRemove}
              showAggregation={id === 'values' && field.column.aggregatable}
              onAggregationChange={onAggregationChange}
            />
          ))}
        </SortableContext>

        {fields.length === 0 && (
          <div className="drop-zone-placeholder">
            {isFull ? 'Zone full' : (placeholder ?? `Drop ${label.toLowerCase()} here`)}
          </div>
        )}
      </div>
    </div>
  );
}
