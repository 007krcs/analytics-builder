// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * KpiDashboard — A grid of KPI cards with optional auto-refresh.
 * Supports drag-to-reorder via @dnd-kit/sortable.
 */

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AnalyticsEngine, KpiConfig, KpiDashboard as KpiDashboardType } from '@gridstorm/analytix-core';
import { KpiCard } from './KpiCard.js';
import { useKpiMany } from '../hooks/useKpi.js';

// ─── SortableKpiCard ─────────────────────────────────────────────────────────

interface SortableKpiCardProps {
  config: KpiConfig;
  engine: AnalyticsEngine;
  colSpan?: number;
  rowSpan?: number;
}

function SortableKpiCard({ config, engine, colSpan = 1, rowSpan = 1 }: SortableKpiCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: config.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${colSpan}`,
    gridRow: `span ${rowSpan}`,
  };

  const results = useKpiMany(engine, [config]);
  const result = results.get(config.id) ?? null;

  const handleRefresh = useCallback(() => {
    engine.computeKpi(config.id, true);
  }, [engine, config.id]);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="kpi-drag-handle" {...listeners} title="Drag to reorder">⠿</div>
      <KpiCard
        config={config}
        result={result}
        onRefresh={handleRefresh}
      />
    </div>
  );
}

// ─── KpiDashboard ─────────────────────────────────────────────────────────────

export interface KpiDashboardProps {
  engine: AnalyticsEngine;
  dashboard: KpiDashboardType;
  kpiConfigs: KpiConfig[];
  onDashboardChange?: (dashboard: KpiDashboardType) => void;
  /** Whether widgets are draggable to reorder */
  editable?: boolean;
  className?: string;
}

export function KpiDashboard({
  engine,
  dashboard,
  kpiConfigs,
  onDashboardChange,
  editable: _editable = false,
  className,
}: KpiDashboardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const configMap = new Map(kpiConfigs.map((c) => [c.id, c]));

  // Ordered widget list
  const sortedWidgets = [...dashboard.widgets].sort(
    (a, b) => a.gridRow * 100 + a.gridCol - (b.gridRow * 100 + b.gridCol)
  );

  const widgetIds = sortedWidgets.map((w) => w.kpiConfigId);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = widgetIds.indexOf(String(active.id));
      const newIdx = widgetIds.indexOf(String(over.id));

      if (oldIdx < 0 || newIdx < 0) return;

      const reorderedWidgets = arrayMove(sortedWidgets, oldIdx, newIdx).map(
        (w, i) => ({ ...w, gridRow: Math.floor(i / dashboard.columns), gridCol: i % dashboard.columns })
      );

      onDashboardChange?.({ ...dashboard, widgets: reorderedWidgets });
    },
    [widgetIds, sortedWidgets, dashboard, onDashboardChange]
  );

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${dashboard.columns}, 1fr)`,
    gap: '16px',
  };

  return (
    <div className={`kpi-dashboard ${className ?? ''}`.trim()}>
      <div className="kpi-dashboard-header">
        <h2 className="kpi-dashboard-title">{dashboard.name}</h2>
        {dashboard.description && (
          <p className="kpi-dashboard-desc">{dashboard.description}</p>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
          <div style={gridStyle} className="kpi-dashboard-grid">
            {sortedWidgets.map((widget) => {
              const config = configMap.get(widget.kpiConfigId);
              if (!config) return null;
              return (
                <SortableKpiCard
                  key={widget.kpiConfigId}
                  config={config}
                  engine={engine}
                  colSpan={widget.colSpan}
                  rowSpan={widget.rowSpan}
                />
              );
            })}

            {sortedWidgets.length === 0 && (
              <div
                className="kpi-dashboard-empty"
                style={{ gridColumn: `span ${dashboard.columns}` }}
              >
                <p>No KPI widgets configured.</p>
                <p>Add KPI configs to the dashboard to see metrics here.</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
