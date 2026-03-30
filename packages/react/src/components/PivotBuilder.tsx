/**
 * PivotBuilder — Drag-and-drop pivot table configuration UI.
 * This is a controlled component — drag state is owned by the parent (AnalyticsBuilder).
 * Props carry the current field assignments and callbacks.
 */

import { useId } from 'react';
import type { AnalyticsEngine, PivotConfig, Dataset } from '@analytix/core';
import type { AggregationFunction } from '@analytix/core';
import { DropZone, type DropZoneField, type DropZoneRole } from './DropZone.js';
import { usePivot } from '../hooks/usePivot.js';
import { PivotTable } from './PivotTable.js';

export type { DropZoneField, DropZoneRole };

export interface PivotBuilderProps {
  engine: AnalyticsEngine;
  dataset: Dataset | null;
  rowFields: DropZoneField[];
  colFields: DropZoneField[];
  valueFields: DropZoneField[];
  showTotals: boolean;
  onRemoveFromZone: (zone: DropZoneRole, fieldId: string) => void;
  onAggregationChange: (fieldId: string, agg: string) => void;
  onTotalsChange: (show: boolean) => void;
  /** Called whenever the pivot config changes */
  onConfigChange?: (config: PivotConfig) => void;
  className?: string;
}

export function PivotBuilder({
  engine,
  dataset,
  rowFields,
  colFields,
  valueFields,
  showTotals,
  onRemoveFromZone,
  onAggregationChange,
  onTotalsChange,
  className,
}: PivotBuilderProps) {
  const id = useId();
  const configId = `pivot-${id}`;

  // Build PivotConfig from props
  const pivotConfig: PivotConfig | null =
    dataset && valueFields.length > 0
      ? {
          id: configId,
          datasetId: dataset.id,
          rowFields: rowFields.map((f) => f.column.id),
          columnFields: colFields.map((f) => f.column.id),
          valueFields: valueFields.map((f) => ({
            columnId: f.column.id,
            aggregation: (f.aggregation as AggregationFunction) ?? 'sum',
            label: `${f.aggregation ?? 'sum'}(${f.column.displayName})`,
          })),
          filters: [],
          showRowTotals: showTotals,
          showColumnTotals: showTotals,
          showSubTotals: false,
          compactMode: false,
        }
      : null;

  const { result, loading, error } = usePivot(engine, pivotConfig);

  const zonesDescId = `${configId}-zones-desc`;

  return (
    <div className={`pivot-builder ${className ?? ''}`.trim()}>
      {/* Accessible description for drop zones */}
      <p id={zonesDescId} className="sr-only">
        Drag fields from the field panel into the Rows, Columns, and Values drop zones
        to configure the pivot table. Each zone accepts one or more fields.
      </p>

      {/* Configuration zones */}
      <div
        className="pivot-builder-zones"
        role="region"
        aria-label="Pivot table configuration"
        aria-describedby={zonesDescId}
      >
        <DropZone
          id="rows"
          label="Rows"
          fields={rowFields}
          onRemove={(fieldId) => onRemoveFromZone('rows', fieldId)}
          placeholder="Drag dimension fields here"
          aria-label="Row fields drop zone — drag dimension fields here to group pivot rows"
        />
        <DropZone
          id="columns"
          label="Columns"
          fields={colFields}
          onRemove={(fieldId) => onRemoveFromZone('columns', fieldId)}
          placeholder="Drag dimension fields here"
          aria-label="Column fields drop zone — drag dimension fields here to create pivot columns"
        />
        <DropZone
          id="values"
          label="Values"
          fields={valueFields}
          onRemove={(fieldId) => onRemoveFromZone('values', fieldId)}
          onAggregationChange={onAggregationChange}
          placeholder="Drag measure fields here"
          aria-label="Value fields drop zone — drag measure fields here to compute aggregations"
        />

        <div className="pivot-builder-options">
          <label className="pivot-option-label">
            <input
              type="checkbox"
              checked={showTotals}
              onChange={(e) => onTotalsChange(e.target.checked)}
            />
            Show totals
          </label>
        </div>
      </div>

      {/* Result table */}
      <div
        className="pivot-builder-result"
        aria-live="polite"
        aria-label="Pivot table results"
      >
        {loading && (
          <div className="pivot-loading" role="status" aria-live="polite">
            Computing pivot table...
          </div>
        )}
        {error && (
          <div className="pivot-error" role="alert">
            Error: {error.message}
          </div>
        )}
        {!loading && !error && result && <PivotTable result={result} />}
        {!loading && !error && !result && (
          <div className="pivot-empty" role="status">
            <p>Drag fields into the Rows and Values zones to build a pivot table.</p>
          </div>
        )}
      </div>
    </div>
  );
}
