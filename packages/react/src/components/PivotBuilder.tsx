/**
 * PivotBuilder — Drag-and-drop pivot table configuration UI.
 *
 * Users drag columns from FieldPanel into rows/columns/values drop zones.
 * The resulting PivotConfig is passed to usePivot() for computation.
 */

import { useCallback, useId, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { AnalyticsEngine, PivotConfig, Dataset, Column } from '@analytix/core';
import type { AggregationFunction } from '@analytix/core';
import { DropZone, type DropZoneField, type DropZoneRole } from './DropZone.js';
import { usePivot } from '../hooks/usePivot.js';
import { PivotTable } from './PivotTable.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let fieldSeq = 0;
function makeFieldId(columnId: string): string {
  return `${columnId}-${++fieldSeq}`;
}

// ─── PivotBuilder ─────────────────────────────────────────────────────────────

export interface PivotBuilderProps {
  engine: AnalyticsEngine;
  dataset: Dataset | null;
  /** Called whenever the pivot config changes */
  onConfigChange?: (config: PivotConfig) => void;
  className?: string;
}

export function PivotBuilder({
  engine,
  dataset,
  onConfigChange,
  className,
}: PivotBuilderProps) {
  const id = useId();
  const configId = `pivot-${id}`;

  const [rowFields, setRowFields] = useState<DropZoneField[]>([]);
  const [colFields, setColFields] = useState<DropZoneField[]>([]);
  const [valueFields, setValueFields] = useState<DropZoneField[]>([]);
  const [showTotals, setShowTotals] = useState(true);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Build PivotConfig from current state
  const buildConfig = useCallback(
    (rows: DropZoneField[], cols: DropZoneField[], vals: DropZoneField[]): PivotConfig | null => {
      if (!dataset || vals.length === 0) return null;
      return {
        id: configId,
        datasetId: dataset.id,
        rowFields: rows.map((f) => f.column.id),
        columnFields: cols.map((f) => f.column.id),
        valueFields: vals.map((f) => ({
          columnId: f.column.id,
          aggregation: (f.aggregation as AggregationFunction) ?? 'sum',
          label: `${f.aggregation ?? 'sum'}(${f.column.displayName})`,
        })),
        filters: [],
        showRowTotals: showTotals,
        showColumnTotals: showTotals,
        showSubTotals: false,
        compactMode: false,
      };
    },
    [configId, dataset, showTotals]
  );

  const [pivotConfig, setPivotConfig] = useState<PivotConfig | null>(null);
  const { result, loading, error } = usePivot(engine, pivotConfig);

  const applyConfig = useCallback(
    (rows: DropZoneField[], cols: DropZoneField[], vals: DropZoneField[]) => {
      const config = buildConfig(rows, cols, vals);
      setPivotConfig(config);
      if (config) onConfigChange?.(config);
    },
    [buildConfig, onConfigChange]
  );

  // ─── DnD handlers ────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'field') {
      setActiveColumn(data.column as Column);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveColumn(null);
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      const overId = String(over.id);

      // Dropping a field from FieldPanel into a drop zone
      if (activeData?.type === 'field') {
        const column = activeData.column as Column;
        const role = overId.replace('dropzone-', '') as DropZoneRole;

        const newField: DropZoneField = {
          id: makeFieldId(column.id),
          column,
          aggregation: column.aggregatable ? 'sum' : undefined,
        };

        let newRows = rowFields;
        let newCols = colFields;
        let newVals = valueFields;

        if (role === 'rows' && !rowFields.find((f) => f.column.id === column.id)) {
          newRows = [...rowFields, newField];
          setRowFields(newRows);
        } else if (role === 'columns' && !colFields.find((f) => f.column.id === column.id)) {
          newCols = [...colFields, newField];
          setColFields(newCols);
        } else if (role === 'values') {
          newVals = [...valueFields, newField];
          setValueFields(newVals);
        }

        applyConfig(newRows, newCols, newVals);
        return;
      }

      // Re-ordering within a zone
      if (activeData?.type === undefined) {
        const reorder = (
          fields: DropZoneField[],
          setFields: (f: DropZoneField[]) => void
        ) => {
          const oldIdx = fields.findIndex((f) => f.id === active.id);
          const newIdx = fields.findIndex((f) => f.id === over.id);
          if (oldIdx >= 0 && newIdx >= 0) {
            const reordered = arrayMove(fields, oldIdx, newIdx);
            setFields(reordered);
            return reordered;
          }
          return fields;
        };

        const newRows = reorder(rowFields, setRowFields);
        const newCols = reorder(colFields, setColFields);
        const newVals = reorder(valueFields, setValueFields);
        applyConfig(newRows, newCols, newVals);
      }
    },
    [rowFields, colFields, valueFields, applyConfig]
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Could highlight the target zone here
  }, []);

  const removeFromZone = useCallback(
    (zone: DropZoneRole, fieldId: string) => {
      let newRows = rowFields;
      let newCols = colFields;
      let newVals = valueFields;

      if (zone === 'rows') { newRows = rowFields.filter((f) => f.id !== fieldId); setRowFields(newRows); }
      if (zone === 'columns') { newCols = colFields.filter((f) => f.id !== fieldId); setColFields(newCols); }
      if (zone === 'values') { newVals = valueFields.filter((f) => f.id !== fieldId); setValueFields(newVals); }

      applyConfig(newRows, newCols, newVals);
    },
    [rowFields, colFields, valueFields, applyConfig]
  );

  const handleAggChange = useCallback(
    (fieldId: string, agg: string) => {
      const newVals = valueFields.map((f) => f.id === fieldId ? { ...f, aggregation: agg } : f);
      setValueFields(newVals);
      applyConfig(rowFields, colFields, newVals);
    },
    [rowFields, colFields, valueFields, applyConfig]
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className={`pivot-builder ${className ?? ''}`.trim()}>
        {/* Configuration zones */}
        <div className="pivot-builder-zones">
          <DropZone
            id="rows"
            label="Rows"
            fields={rowFields}
            onRemove={(id) => removeFromZone('rows', id)}
            placeholder="Drag dimension fields here"
          />
          <DropZone
            id="columns"
            label="Columns"
            fields={colFields}
            onRemove={(id) => removeFromZone('columns', id)}
            placeholder="Drag dimension fields here"
          />
          <DropZone
            id="values"
            label="Values"
            fields={valueFields}
            onRemove={(id) => removeFromZone('values', id)}
            onAggregationChange={handleAggChange}
            placeholder="Drag measure fields here"
          />

          <div className="pivot-builder-options">
            <label className="pivot-option-label">
              <input
                type="checkbox"
                checked={showTotals}
                onChange={(e) => {
                  setShowTotals(e.target.checked);
                  applyConfig(rowFields, colFields, valueFields);
                }}
              />
              Show totals
            </label>
          </div>
        </div>

        {/* Result table */}
        <div className="pivot-builder-result">
          {loading && <div className="pivot-loading">Computing pivot table...</div>}
          {error && <div className="pivot-error">Error: {error.message}</div>}
          {!loading && !error && result && <PivotTable result={result} />}
          {!loading && !error && !result && (
            <div className="pivot-empty">
              <p>Drag fields into the Rows and Values zones to build a pivot table.</p>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeColumn && (
          <div className="field-chip field-chip--overlay">
            {activeColumn.displayName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
