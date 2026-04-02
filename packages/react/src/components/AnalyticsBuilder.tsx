/**
 * AnalyticsBuilder — The main drag-and-drop analytics canvas.
 *
 * Combines:
 *  - FieldPanel (left sidebar with dataset fields)
 *  - Tab-based workspace (Pivot / Charts / KPIs / Reports)
 *  - Dataset selector / upload
 *
 * Owns one DndContext that wraps both the FieldPanel sidebar and the
 * PivotBuilder workspace so drag-and-drop works across the split layout.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { AnalyticsEngine, Dataset, PivotConfig, ChartConfig, KpiConfig, Column } from '@gridstorm/analytix-core';
import { FieldPanel } from './FieldPanel.js';
import { PivotBuilder } from './PivotBuilder.js';
import type { DropZoneField, DropZoneRole } from './DropZone.js';
import { ChartBuilder } from './ChartBuilder.js';
import { KpiDashboard } from './KpiDashboard.js';
import { ReportScheduler } from './ReportScheduler.js';
import { ReportBuilder as ReportBuilderClass } from '@gridstorm/analytix-report-builder';
import type { ScheduleConfig } from '@gridstorm/analytix-core';

export type BuilderTab = 'pivot' | 'chart' | 'kpi' | 'report';

export interface AnalyticsBuilderProps {
  engine: AnalyticsEngine;
  initialDataset?: Dataset;
  onExport?: (format: 'pdf' | 'excel') => void;
  className?: string;
}

let fieldSeq = 0;
function makeFieldId(columnId: string): string {
  return `${columnId}-${++fieldSeq}`;
}

function makeDefaultKpis(dataset: Dataset): KpiConfig[] {
  const measCols = dataset.columns.filter((c) => c.aggregatable);
  const configs: KpiConfig[] = [];

  const revCol = measCols.find((c) => c.id === 'revenue') ?? measCols[0];
  if (revCol) {
    const total = dataset.rows.reduce((s, r) => s + (Number(r[revCol.id]) || 0), 0);
    configs.push({
      id: `kpi-${revCol.id}`,
      title: revCol.displayName,
      description: `Sum of ${revCol.displayName.toLowerCase()}`,
      datasetId: dataset.id,
      columnId: revCol.id,
      aggregation: 'sum',
      filters: [],
      decimals: 0,
      format: 'currency',
      prefix: '$',
      threshold: { warning: total * 0.8, critical: total * 0.6, target: total, comparisonType: 'greater_is_better' },
      refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
    });
  }

  const profitCol = measCols.find((c) => c.id === 'profit') ?? measCols.find((c) => c !== revCol && c.id !== 'revenue');
  if (profitCol) {
    const total = dataset.rows.reduce((s, r) => s + (Number(r[profitCol.id]) || 0), 0);
    configs.push({
      id: `kpi-${profitCol.id}`,
      title: profitCol.displayName,
      description: `Sum of ${profitCol.displayName.toLowerCase()}`,
      datasetId: dataset.id,
      columnId: profitCol.id,
      aggregation: 'sum',
      filters: [],
      decimals: 0,
      threshold: { warning: total * 0.7, critical: total * 0.5, comparisonType: 'greater_is_better' },
      refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
    });
  }

  const satCol = measCols.find((c) => c.id === 'customer_satisfaction') ?? measCols.find((c) => c !== revCol && c !== profitCol);
  if (satCol) {
    const total = dataset.rows.reduce((s, r) => s + (Number(r[satCol.id]) || 0), 0);
    const avg = dataset.rows.length > 0 ? total / dataset.rows.length : 0;
    configs.push({
      id: `kpi-${satCol.id}`,
      title: `Avg ${satCol.displayName}`,
      description: `Average ${satCol.displayName.toLowerCase()}`,
      datasetId: dataset.id,
      columnId: satCol.id,
      aggregation: 'avg',
      filters: [],
      decimals: 2,
      threshold: { warning: avg * 0.8, critical: avg * 0.6, target: avg * 1.1, comparisonType: 'greater_is_better' },
      refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
    });
  }

  const unitsCol = measCols.find((c) => c.id === 'units') ?? measCols.find((c) => c !== revCol && c !== profitCol && c !== satCol);
  if (unitsCol) {
    const total = dataset.rows.reduce((s, r) => s + (Number(r[unitsCol.id]) || 0), 0);
    configs.push({
      id: `kpi-${unitsCol.id}`,
      title: unitsCol.displayName,
      description: `Total ${unitsCol.displayName.toLowerCase()}`,
      datasetId: dataset.id,
      columnId: unitsCol.id,
      aggregation: 'sum',
      filters: [],
      decimals: 0,
      format: 'compact',
      threshold: { warning: total * 0.75, critical: total * 0.5, comparisonType: 'greater_is_better' },
      refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
    });
  }

  return configs;
}

function makeDefaultFields(dataset: Dataset): {
  rowFields: DropZoneField[];
  colFields: DropZoneField[];
  valueFields: DropZoneField[];
} {
  const cols = dataset.columns;
  const dimCols = cols.filter((c) => c.dimensional);
  const measCols = cols.filter((c) => c.aggregatable);

  const rowFields: DropZoneField[] = [];
  const colFields: DropZoneField[] = [];
  const valueFields: DropZoneField[] = [];

  // Try to use 'region' or first dimensional col as rows
  const rowCol = dimCols.find((c) => c.id === 'region') ?? dimCols[0];
  if (rowCol) rowFields.push({ id: makeFieldId(rowCol.id), column: rowCol });

  // Try to use 'category' or second dimensional col as columns
  const colCol = dimCols.find((c) => c.id === 'category') ?? dimCols.find((c) => c !== rowCol);
  if (colCol) colFields.push({ id: makeFieldId(colCol.id), column: colCol });

  // Try to use 'revenue' or first measure as value
  const valCol = measCols.find((c) => c.id === 'revenue') ?? measCols[0];
  if (valCol) valueFields.push({ id: makeFieldId(valCol.id), column: valCol, aggregation: 'sum' });

  return { rowFields, colFields, valueFields };
}

export function AnalyticsBuilder({
  engine,
  initialDataset,
  onExport,
  className,
}: AnalyticsBuilderProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>('pivot');
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(initialDataset ?? null);
  const [fieldSearch, setFieldSearch] = useState('');
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [kpiConfigs] = useState<KpiConfig[]>(() =>
    initialDataset ? makeDefaultKpis(initialDataset) : []
  );
  const [reportConfig, setReportConfig] = useState(() =>
    new ReportBuilderClass('report-main', 'Analytics Report').build()
  );

  // ── Pivot drag state (lifted from PivotBuilder) ───────────────────────────
  const initialDefaults = initialDataset ? makeDefaultFields(initialDataset) : { rowFields: [], colFields: [], valueFields: [] };
  const [rowFields, setRowFields] = useState<DropZoneField[]>(() => initialDefaults.rowFields);
  const [colFields, setColFields] = useState<DropZoneField[]>(() => initialDefaults.colFields);
  const [valueFields, setValueFields] = useState<DropZoneField[]>(() => initialDefaults.valueFields);
  const [showTotals, setShowTotals] = useState(true);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const datasets = engine.getAllDatasets();

  // Register the report config with the engine on mount
  useEffect(() => {
    engine.addReportConfig(reportConfig);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset pivot fields when dataset changes
  useEffect(() => {
    if (activeDataset) {
      const defaults = makeDefaultFields(activeDataset);
      setRowFields(defaults.rowFields);
      setColFields(defaults.colFields);
      setValueFields(defaults.valueFields);
    } else {
      setRowFields([]);
      setColFields([]);
      setValueFields([]);
    }
  }, [activeDataset?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDatasetChange = useCallback(
    (datasetId: string) => {
      const ds = engine.getDataset(datasetId);
      setActiveDataset(ds ?? null);
    },
    [engine]
  );

  // ── Drag handlers ─────────────────────────────────────────────────────────

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

        if (role === 'rows') {
          setRowFields((prev) =>
            prev.find((f) => f.column.id === column.id) ? prev : [...prev, newField]
          );
        } else if (role === 'columns') {
          setColFields((prev) =>
            prev.find((f) => f.column.id === column.id) ? prev : [...prev, newField]
          );
        } else if (role === 'values') {
          setValueFields((prev) => [...prev, newField]);
        }
        return;
      }

      // Re-ordering within a zone
      const reorder = (fields: DropZoneField[]): DropZoneField[] => {
        const oldIdx = fields.findIndex((f) => f.id === active.id);
        const newIdx = fields.findIndex((f) => f.id === over.id);
        if (oldIdx >= 0 && newIdx >= 0) return arrayMove(fields, oldIdx, newIdx);
        return fields;
      };

      setRowFields((prev) => reorder(prev));
      setColFields((prev) => reorder(prev));
      setValueFields((prev) => reorder(prev));
    },
    []
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {}, []);

  const handleRemoveFromZone = useCallback((zone: DropZoneRole, fieldId: string) => {
    if (zone === 'rows')    setRowFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (zone === 'columns') setColFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (zone === 'values')  setValueFields((prev) => prev.filter((f) => f.id !== fieldId));
  }, []);

  const handleAggregationChange = useCallback((fieldId: string, agg: string) => {
    setValueFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, aggregation: agg } : f))
    );
  }, []);

  // ── Report handlers ───────────────────────────────────────────────────────

  const handleAddSchedule = useCallback(
    (schedule: ScheduleConfig) => {
      if (!reportConfig) return;
      engine.updateReportConfig(reportConfig.id, {
        schedules: [...reportConfig.schedules, schedule],
      });
      setReportConfig((prev) => ({
        ...prev,
        schedules: [...prev.schedules, schedule],
      }));
    },
    [engine, reportConfig]
  );

  const handleRemoveSchedule = useCallback(
    (scheduleId: string) => {
      setReportConfig((prev) => ({
        ...prev,
        schedules: prev.schedules.filter((s) => s.id !== scheduleId),
      }));
    },
    []
  );

  const handleToggleSchedule = useCallback(
    (scheduleId: string, enabled: boolean) => {
      setReportConfig((prev) => ({
        ...prev,
        schedules: prev.schedules.map((s) =>
          s.id === scheduleId ? { ...s, enabled } : s
        ),
      }));
    },
    []
  );

  const tabs: { id: BuilderTab; label: string; icon: string }[] = [
    { id: 'pivot', label: 'Pivot Table', icon: '⊞' },
    { id: 'chart', label: 'Charts', icon: '📊' },
    { id: 'kpi', label: 'KPIs', icon: '📈' },
    { id: 'report', label: 'Reports', icon: '📄' },
  ];

  // Default chart config for immediate preview
  const defaultChartInitial = activeDataset
    ? {
        id: 'chart-default',
        type: 'bar' as const,
        title: 'Revenue by Region',
        xField:
          activeDataset.columns.find((c) => c.id === 'region')?.id ??
          activeDataset.columns.find((c) => c.dimensional)?.id ??
          '',
        series: (() => {
          const rev =
            activeDataset.columns.find((c) => c.id === 'revenue') ??
            activeDataset.columns.find((c) => c.aggregatable);
          return rev
            ? [{ id: 'series-0', columnId: rev.id, label: rev.displayName }]
            : [];
        })(),
      }
    : undefined;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className={`analytics-builder ${className ?? ''}`.trim()}>
        {/* Top toolbar */}
        <div className="analytics-builder-toolbar">
          <div className="toolbar-brand">
            <span className="toolbar-logo">⚡</span>
            <span className="toolbar-title">Analytics Builder</span>
          </div>

          <div className="toolbar-dataset-selector">
            <label className="toolbar-label">Dataset</label>
            <select
              className="toolbar-dataset-select"
              value={activeDataset?.id ?? ''}
              onChange={(e) => handleDatasetChange(e.target.value)}
            >
              <option value="">Select dataset...</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.source.rowCount.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>

          <div className="toolbar-actions">
            <button
              className="toolbar-btn"
              onClick={() => onExport?.('pdf')}
              title="Export as PDF"
            >
              PDF
            </button>
            <button
              className="toolbar-btn"
              onClick={() => onExport?.('excel')}
              title="Export as Excel"
            >
              Excel
            </button>
          </div>
        </div>

        <div className="analytics-builder-body">
          {/* Left sidebar: field panel */}
          <aside className="analytics-builder-sidebar">
            <FieldPanel
              dataset={activeDataset}
              searchQuery={fieldSearch}
              onSearchChange={setFieldSearch}
            />
          </aside>

          {/* Main workspace */}
          <main className="analytics-builder-main">
            {/* Tab navigation */}
            <div className="analytics-builder-tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`analytics-tab ${activeTab === tab.id ? 'analytics-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="analytics-tab-icon">{tab.icon}</span>
                  <span className="analytics-tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="analytics-builder-workspace">
              {activeTab === 'pivot' && (
                <PivotBuilder
                  engine={engine}
                  dataset={activeDataset}
                  rowFields={rowFields}
                  colFields={colFields}
                  valueFields={valueFields}
                  showTotals={showTotals}
                  onRemoveFromZone={handleRemoveFromZone}
                  onAggregationChange={handleAggregationChange}
                  onTotalsChange={setShowTotals}
                  onConfigChange={setPivotConfig}
                />
              )}

              {activeTab === 'chart' && (
                <ChartBuilder
                  engine={engine}
                  dataset={activeDataset}
                  initialConfig={chartConfig ?? defaultChartInitial}
                  onConfigChange={setChartConfig}
                />
              )}

              {activeTab === 'kpi' && (
                <div className="kpi-workspace">
                  {kpiConfigs.length === 0 ? (
                    <div className="kpi-empty-state">
                      <h3>No KPIs configured</h3>
                      <p>KPI metrics will appear here once configured.</p>
                      <p>Use the engine API to add KPI configurations:</p>
                      <code className="kpi-code-sample">{`engine.addKpiConfig({ id: 'kpi-1', title: 'Total Revenue', ... })`}</code>
                    </div>
                  ) : (
                    <KpiDashboard
                      engine={engine}
                      dashboard={{
                        id: 'main-dashboard',
                        name: 'KPI Overview',
                        columns: 3,
                        widgets: kpiConfigs.map((c, i) => ({
                          id: `widget-${c.id}`,
                          kpiConfigId: c.id,
                          gridRow: Math.floor(i / 3),
                          gridCol: i % 3,
                          rowSpan: 1,
                          colSpan: 1,
                          size: 'medium' as const,
                          variant: 'default' as const,
                        })),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      }}
                      kpiConfigs={kpiConfigs}
                    />
                  )}
                </div>
              )}

              {activeTab === 'report' && (
                <div className="report-workspace">
                  <div className="report-info">
                    <h3>Report: {reportConfig.name}</h3>
                    <p>
                      {reportConfig.sections.length} sections ·{' '}
                      {reportConfig.schedules.length} schedules
                    </p>
                  </div>
                  {pivotConfig && (
                    <div className="report-config-section">
                      <p>
                        Pivot config "{pivotConfig.id}" will be included in the report.
                      </p>
                    </div>
                  )}
                  <ReportScheduler
                    report={reportConfig}
                    onAddSchedule={handleAddSchedule}
                    onRemoveSchedule={handleRemoveSchedule}
                    onToggleSchedule={handleToggleSchedule}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Drag overlay — shows the dragged field chip */}
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
