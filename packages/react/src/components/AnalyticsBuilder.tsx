/**
 * AnalyticsBuilder — The main drag-and-drop analytics canvas.
 *
 * Combines:
 *  - FieldPanel (left sidebar with dataset fields)
 *  - Tab-based workspace (Pivot / Charts / KPIs / Reports)
 *  - Dataset selector / upload
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { AnalyticsEngine, Dataset, PivotConfig, ChartConfig, KpiConfig } from '@analytix/core';
import { FieldPanel } from './FieldPanel.js';
import { PivotBuilder } from './PivotBuilder.js';
import { ChartBuilder } from './ChartBuilder.js';
import { KpiDashboard } from './KpiDashboard.js';
import { ReportScheduler } from './ReportScheduler.js';
import { ReportBuilder as ReportBuilderClass } from '@analytix/report-builder';
import type { ScheduleConfig } from '@analytix/core';

export type BuilderTab = 'pivot' | 'chart' | 'kpi' | 'report';

export interface AnalyticsBuilderProps {
  engine: AnalyticsEngine;
  initialDataset?: Dataset;
  onExport?: (format: 'pdf' | 'excel') => void;
  className?: string;
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
  const [pivotConfig, setPivotConfig] = useState<PivotConfig | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [kpiConfigs] = useState<KpiConfig[]>([]);
  const [reportConfig, setReportConfig] = useState(() =>
    new ReportBuilderClass('report-main', 'Analytics Report').build()
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const datasets = engine.getAllDatasets();

  const handleDatasetChange = useCallback(
    (datasetId: string) => {
      const ds = engine.getDataset(datasetId);
      setActiveDataset(ds ?? null);
    },
    [engine]
  );

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

  return (
    <DndContext sensors={sensors}>
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
                  onConfigChange={setPivotConfig}
                />
              )}

              {activeTab === 'chart' && (
                <ChartBuilder
                  engine={engine}
                  dataset={activeDataset}
                  initialConfig={chartConfig ?? undefined}
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
                    <p>{reportConfig.sections.length} sections · {reportConfig.schedules.length} schedules</p>
                  </div>
                  {pivotConfig && (
                    <div className="report-config-section">
                      <p>Pivot config "{pivotConfig.id}" will be included in the report.</p>
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
    </DndContext>
  );
}
