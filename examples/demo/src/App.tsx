/**
 * App.tsx — Analytix Demo Application
 *
 * Six tabs:
 *  1. Pivot Builder      — pivot table with cross-filter badge + data import button
 *  2. Chart Builder      — full AnalyticsBuilder drag-and-drop canvas
 *  3. KPI Dashboard      — 4 KPI cards
 *  4. Report Scheduler   — report builder + schedule UI
 *  5. AI Insights        — InsightEngine demo on SALES_DATA (no API key needed)
 *  6. Live Canvas        — DashboardCanvas with 3 pre-placed widgets
 *
 * No Tailwind, no Bootstrap. All styles in styles.css.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalyticsEngine } from '@analytix/core';
import type { Dataset, KpiConfig, PivotConfig, Row } from '@analytix/core';
import { computePivot as _computePivot } from '@analytix/pivot-engine';
import { computeKpi as _computeKpi }     from '@analytix/kpi-engine';
import {
  AnalyticsBuilder,
  KpiCard,
  PivotTable,
  useAnalyticsEngine,
  usePivot,
  useKpi,
} from '@analytix/react';

// ── New differentiators ────────────────────────────────────────
import { InsightEngine }       from '@analytix/insight-engine';
import type { Insight, InsightResult } from '@analytix/insight-engine';
import { CrossFilterProvider, useCrossFilter } from '@analytix/crossfilter';
import { DataImportPanel }     from '@analytix/data-connector';
import type { DataImportPanelProps } from '@analytix/data-connector';
import { DashboardCanvas, CanvasEngine } from '@analytix/canvas-layout';
import type { CanvasWidget } from '@analytix/canvas-layout';

import { SALES_DATA, EMPLOYEE_DATA, SALES_STATS } from './data/sample-data.js';

import './styles.css';

// ─── KPI configurations ───────────────────────────────────────

const KPI_REVENUE: KpiConfig = {
  id: 'kpi-revenue',
  title: 'Total Revenue',
  description: 'Sum of all sales revenue',
  datasetId: 'sales',
  columnId: 'revenue',
  aggregation: 'sum',
  filters: [],
  threshold: {
    warning: SALES_STATS.totalRevenue * 0.8,
    critical: SALES_STATS.totalRevenue * 0.6,
    target: SALES_STATS.totalRevenue,
    comparisonType: 'greater_is_better',
  },
  format: 'currency',
  prefix: '$',
  decimals: 0,
  refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
};

const KPI_PROFIT: KpiConfig = {
  id: 'kpi-profit',
  title: 'Total Profit',
  description: 'Net profit after cost',
  datasetId: 'sales',
  columnId: 'profit',
  aggregation: 'sum',
  filters: [],
  threshold: {
    warning: SALES_STATS.totalProfit * 0.7,
    critical: SALES_STATS.totalProfit * 0.5,
    comparisonType: 'greater_is_better',
  },
  format: 'currency',
  prefix: '$',
  decimals: 0,
  refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
};

const KPI_AVG_SATISFACTION: KpiConfig = {
  id: 'kpi-satisfaction',
  title: 'Avg Satisfaction',
  description: 'Customer satisfaction score (1–5)',
  datasetId: 'sales',
  columnId: 'customer_satisfaction',
  aggregation: 'avg',
  filters: [],
  threshold: {
    warning: 3.5,
    critical: 2.5,
    target: 4.5,
    comparisonType: 'greater_is_better',
  },
  format: 'compact',
  unit: '/ 5',
  decimals: 2,
  refreshPolicy: { enabled: false, intervalSeconds: 60, pauseWhenHidden: true },
};

const KPI_UNITS: KpiConfig = {
  id: 'kpi-units',
  title: 'Units Sold',
  datasetId: 'sales',
  columnId: 'units',
  aggregation: 'sum',
  filters: [],
  threshold: {
    warning: SALES_STATS.totalUnits * 0.75,
    critical: SALES_STATS.totalUnits * 0.5,
    comparisonType: 'greater_is_better',
  },
  format: 'compact',
  decimals: 0,
  refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
};

// ─── Pre-configured pivot ─────────────────────────────────────

const PIVOT_REVENUE_BY_REGION: PivotConfig = {
  id: 'pivot-revenue-region',
  datasetId: 'sales',
  rowFields: ['region'],
  columnFields: ['category'],
  valueFields: [
    { columnId: 'revenue', aggregation: 'sum', label: 'Revenue ($)', format: 'currency' },
    { columnId: 'profit_margin', aggregation: 'avg', label: 'Margin (%)', format: 'percent' },
  ],
  filters: [],
  showRowTotals: true,
  showColumnTotals: true,
  showSubTotals: false,
  compactMode: false,
};

// ─── Tab config ───────────────────────────────────────────────

type DemoTab = 'pivot' | 'charts' | 'kpis' | 'reports' | 'insights' | 'canvas';

const TAB_CONFIG: Array<{ id: DemoTab; label: string; icon: string }> = [
  { id: 'pivot',    label: 'Pivot Builder',    icon: '⊞' },
  { id: 'charts',   label: 'Chart Builder',    icon: '📊' },
  { id: 'kpis',     label: 'KPI Dashboard',    icon: '📈' },
  { id: 'reports',  label: 'Report Scheduler', icon: '📄' },
  { id: 'insights', label: 'AI Insights',      icon: '🤖' },
  { id: 'canvas',   label: 'Live Canvas',      icon: '🎨' },
];

// ─── Root App ─────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<DemoTab>('pivot');
  const { engine, loadDataset, version: _version } = useAnalyticsEngine();

  useEffect(() => {
    loadDataset('sales',     'Sales Data',    SALES_DATA    as unknown as Row[]);
    loadDataset('employees', 'Employee Data', EMPLOYEE_DATA as unknown as Row[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salesDataset = engine.getDataset('sales') ?? undefined;

  return (
    <div className="app">

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="app-header" role="banner">
        <div className="app-brand">
          <div className="app-logo">A</div>
          <div>
            <h1 className="app-title">Analytix</h1>
            <p className="app-subtitle">Powered by GridStorm</p>
          </div>
        </div>

        <div className="app-dataset-info" aria-label="Loaded datasets">
          <div className="dataset-badge">
            <span className="dataset-badge-icon">📊</span>
            <span>{SALES_DATA.length.toLocaleString()} sales records</span>
          </div>
          <div className="dataset-badge">
            <span className="dataset-badge-icon">👥</span>
            <span>{EMPLOYEE_DATA.length.toLocaleString()} employees</span>
          </div>
        </div>
      </header>

      {/* ── Tab navigation ───────────────────────────────────── */}
      <nav className="app-nav" role="navigation" aria-label="Demo sections">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            className={`app-nav-tab${activeTab === tab.id ? ' app-nav-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="app-main" role="main" id="main-content">

        <CrossFilterProvider>
          {activeTab === 'pivot' && (
            <PivotBuilderTab engine={engine} />
          )}
        </CrossFilterProvider>

        {activeTab === 'charts' && (
          <ChartBuilderTab engine={engine} salesDataset={salesDataset} />
        )}

        {activeTab === 'kpis' && (
          <KpiDashboardTab engine={engine} />
        )}

        {activeTab === 'reports' && (
          <ReportSchedulerTab engine={engine} />
        )}

        {activeTab === 'insights' && (
          <AiInsightsTab />
        )}

        {activeTab === 'canvas' && (
          <LiveCanvasTab />
        )}

      </main>
    </div>
  );
}

// ─── Pivot Builder tab ────────────────────────────────────────

function PivotBuilderTab({ engine }: { engine: AnalyticsEngine }) {
  const { result, loading, error } = usePivot(engine, PIVOT_REVENUE_BY_REGION);
  const [showImport, setShowImport] = useState(false);

  // Cross-filter hook for pivot tab (widget id = 'pivot-main', dataset = 'sales')
  const allRows = (engine.getDataset('sales')?.rows ?? []) as Row[];
  const {
    isFiltered,
    filterCount,
    clearFilter,
  } = useCrossFilter('pivot-main', 'sales', allRows);

  const handleImport = useCallback<DataImportPanelProps['onImport']>((_dataset: Dataset) => {
    setShowImport(false);
    // In a real app: engine.loadDatasetFromDataset(dataset)
    alert(`Imported ${_dataset.rows.length} rows — integrate engine.loadDataset() to use live data.`);
  }, []);

  return (
    <section className="demo-section" aria-labelledby="pivot-heading">
      <div className="demo-section-header">
        <h2 id="pivot-heading">Revenue by Region × Category</h2>
        <p>
          Pre-configured pivot — revenue sum and profit margin average.
          Switch to the Chart Builder tab to drag-and-drop your own analysis.
        </p>

        {/* Cross-filter badge */}
        <div className="pivot-toolbar">
          {isFiltered && (
            <div className="crossfilter-badge" role="status">
              <span aria-hidden="true">🔗</span>
              Cross-filter active ({filterCount} dimension{filterCount > 1 ? 's' : ''})
              <button
                className="crossfilter-badge__clear"
                onClick={clearFilter}
                aria-label="Clear cross-filter"
              >
                ×
              </button>
            </div>
          )}

          <button
            className="import-trigger-btn"
            onClick={() => setShowImport(true)}
            aria-expanded={showImport}
            aria-controls="import-panel-portal"
          >
            <span aria-hidden="true">⬆</span> Import Data
          </button>
        </div>
      </div>

      {loading && <div className="demo-loading">Computing pivot table…</div>}
      {error   && <div className="demo-error">Error: {error.message}</div>}
      {result  && !loading && <PivotTable result={result} />}

      {!loading && !error && !result && (
        <div className="pivot-empty">No data yet — load a dataset to see the pivot table.</div>
      )}

      {/* Data Import Panel modal */}
      {showImport && (
        <div className="import-modal-overlay" id="import-panel-portal" role="presentation">
          <DataImportPanel
            onImport={handleImport}
            onClose={() => setShowImport(false)}
          />
        </div>
      )}
    </section>
  );
}

// ─── Chart Builder tab ────────────────────────────────────────

function ChartBuilderTab({
  engine,
  salesDataset,
}: {
  engine: AnalyticsEngine;
  salesDataset: ReturnType<AnalyticsEngine['getDataset']>;
}) {
  return (
    <section className="demo-section" aria-labelledby="charts-heading">
      <div className="demo-section-header">
        <h2 id="charts-heading">Analytics Builder</h2>
        <p>
          Drag-and-drop pivot tables, 20+ chart types, KPI dashboards — no SQL required.
          Select a dataset from the toolbar, then drag fields into the drop zones.
        </p>
      </div>

      <AnalyticsBuilder
        engine={engine}
        initialDataset={salesDataset ?? undefined}
        onExport={(fmt: string) =>
          alert(
            `Export as ${fmt.toUpperCase()} — integrate @analytix/report-builder for full PDF/Excel generation.`
          )
        }
      />
    </section>
  );
}

// ─── KPI Dashboard tab ────────────────────────────────────────

function KpiDashboardTab({ engine }: { engine: AnalyticsEngine }) {
  const { result: revenueResult }      = useKpi(engine, KPI_REVENUE);
  const { result: profitResult }       = useKpi(engine, KPI_PROFIT);
  const { result: satisfactionResult } = useKpi(engine, KPI_AVG_SATISFACTION);
  const { result: unitsResult }        = useKpi(engine, KPI_UNITS);

  const kpis: Array<{ config: KpiConfig; result: ReturnType<typeof useKpi>['result'] }> = [
    { config: KPI_REVENUE,          result: revenueResult },
    { config: KPI_PROFIT,           result: profitResult },
    { config: KPI_AVG_SATISFACTION, result: satisfactionResult },
    { config: KPI_UNITS,            result: unitsResult },
  ];

  return (
    <section className="demo-section" aria-labelledby="kpi-heading">
      <div className="demo-section-header">
        <h2 id="kpi-heading">KPI Dashboard</h2>
        <p>
          Key metrics computed from {SALES_DATA.length.toLocaleString()} sales records.
          Border colour reflects threshold status: green = good, yellow = warning, red = critical.
        </p>
      </div>

      <article aria-label="KPI cards">
        <div className="kpi-demo-grid">
          {kpis.map(({ config, result }) => (
            <KpiCard
              key={config.id}
              config={config}
              result={result}
              size="medium"
              variant="default"
            />
          ))}
        </div>
      </article>

      <article aria-label="Dataset statistics">
        <div className="demo-stats-row">
          <StatCard label="Total Records"      value={SALES_DATA.length.toLocaleString()} />
          <StatCard label="Avg Profit Margin"  value={`${SALES_STATS.avgProfitMargin.toFixed(1)}%`} />
          <StatCard label="Regions Covered"    value="5" />
          <StatCard label="Product Categories" value="5" />
          <StatCard label="Sales Team Size"    value="10" />
          <StatCard label="Channels"           value="4" />
        </div>
      </article>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ─── Report Scheduler tab ─────────────────────────────────────

function ReportSchedulerTab({ engine: _engine }: { engine: AnalyticsEngine }) {
  return (
    <section className="demo-section" aria-labelledby="reports-heading">
      <div className="demo-section-header">
        <h2 id="reports-heading">Report Scheduler</h2>
        <p>
          Compose multi-section reports with the fluent builder API. Schedule via
          interval, cron expression, or one-time delivery. Export to PDF or Excel.
        </p>
      </div>

      <div className="report-workspace">
        <div className="report-info">
          <h3>@analytix/report-builder</h3>
          <p>
            Chain <code>addPivot()</code>, <code>addChart()</code>, <code>addKpiSummary()</code>,
            and <code>addText()</code> calls then call <code>.schedule(&#123;…&#125;).build()</code>
            to get a serialisable <code>ReportDefinition</code>.
          </p>
        </div>

        <div className="report-config-section">
          <strong>Quick example</strong> — weekly PDF + Excel on Mondays at 8am:
          <br />
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginTop: '8px', display: 'block' }}>
            ReportBuilder.create("Weekly Sales").addPivot(cfg).addKpiSummary(kpis).schedule(&#123;&nbsp;type:&nbsp;'cron',&nbsp;cron:&nbsp;'0 8 * * 1',&nbsp;formats:&nbsp;['pdf','excel']&nbsp;&#125;).build()
          </code>
        </div>

        <ReportSchedulerWidget />
      </div>
    </section>
  );
}

// ─── Inline schedule list + add form ─────────────────────────

interface ScheduleEntry {
  id: string;
  name: string;
  scheduleType: 'interval' | 'cron' | 'once';
  scheduleValue: string;
  formats: string[];
  enabled: boolean;
}

function ReportSchedulerWidget() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([
    {
      id: 'default-1',
      name: 'Weekly Sales Report',
      scheduleType: 'cron',
      scheduleValue: '0 8 * * 1',
      formats: ['pdf', 'excel'],
      enabled: true,
    },
  ]);

  const [form, setForm] = useState({
    name: '',
    scheduleType: 'interval' as ScheduleEntry['scheduleType'],
    scheduleValue: '',
    formatPdf: true,
    formatExcel: false,
  });

  const [nameError,     setNameError]     = useState('');
  const [scheduleError, setScheduleError] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;

    if (!form.name.trim()) {
      setNameError('Report name is required.');
      valid = false;
    } else {
      setNameError('');
    }

    if (!form.scheduleValue.trim()) {
      setScheduleError('Schedule value is required.');
      valid = false;
    } else {
      setScheduleError('');
    }

    if (!form.formatPdf && !form.formatExcel) {
      setScheduleError('Select at least one output format.');
      valid = false;
    }

    if (!valid) return;

    const formats: string[] = [];
    if (form.formatPdf)   formats.push('pdf');
    if (form.formatExcel) formats.push('excel');

    setEntries((prev) => [
      ...prev,
      {
        id: `entry-${Date.now()}`,
        name: form.name.trim(),
        scheduleType: form.scheduleType,
        scheduleValue: form.scheduleValue.trim(),
        formats,
        enabled: true,
      },
    ]);

    setForm({ name: '', scheduleType: 'interval', scheduleValue: '', formatPdf: true, formatExcel: false });
    setNameError('');
    setScheduleError('');
  }

  function toggleEnabled(id: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const scheduleHint =
    form.scheduleType === 'interval' ? 'Milliseconds, e.g. 3600000 for 1 hour' :
    form.scheduleType === 'cron'     ? 'Cron expression, e.g. 0 8 * * 1 (Mon 8am)' :
                                       'ISO timestamp, e.g. 2026-12-01T09:00:00';

  return (
    <div className="report-scheduler">
      <h3 className="report-scheduler-title">Scheduled Reports</h3>

      <div className="schedule-list" role="list" aria-label="Scheduled reports">
        {entries.length === 0 && (
          <p className="schedule-empty">No reports scheduled yet. Add one below.</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`schedule-row${!entry.enabled ? ' schedule-row--disabled' : ''}`}
            role="listitem"
          >
            <div className="schedule-row-info">
              <span className="schedule-row-name">{entry.name}</span>
              <div className="schedule-row-formats">
                {entry.formats.map((f) => (
                  <span key={f} className="schedule-format-badge">{f.toUpperCase()}</span>
                ))}
              </div>
              <span className="schedule-row-meta">
                {entry.scheduleType}: {entry.scheduleValue}
              </span>
            </div>
            <div className="schedule-row-actions">
              <label className="schedule-toggle">
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={() => toggleEnabled(entry.id)}
                  aria-label={`Toggle ${entry.name}`}
                />
                {entry.enabled ? 'Active' : 'Paused'}
              </label>
              <button
                className="schedule-remove-btn"
                onClick={() => removeEntry(entry.id)}
                aria-label={`Remove ${entry.name}`}
                title="Remove schedule"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <form className="schedule-form" onSubmit={handleAdd} noValidate aria-label="Add schedule">
        <h4 className="schedule-form-title">Add New Schedule</h4>

        <div className="schedule-field">
          <label className="schedule-label" htmlFor="sched-name">Report Name</label>
          <input
            id="sched-name"
            className={`schedule-input${nameError ? ' schedule-input--error' : ''}`}
            type="text"
            placeholder="e.g. Monthly Executive Report"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          {nameError && <span className="schedule-error" role="alert">{nameError}</span>}
        </div>

        <div className="schedule-field">
          <span className="schedule-label">Schedule Type</span>
          <div className="schedule-type-tabs" role="group" aria-label="Schedule type">
            {(['interval', 'cron', 'once'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`schedule-type-tab${form.scheduleType === t ? ' schedule-type-tab--active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, scheduleType: t, scheduleValue: '' }))}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="schedule-field">
          <label className="schedule-label" htmlFor="sched-val">
            {form.scheduleType === 'interval' ? 'Interval (ms)' :
             form.scheduleType === 'cron'     ? 'Cron Expression' :
                                                'ISO Timestamp'}
          </label>
          <input
            id="sched-val"
            className={`schedule-input schedule-input--code${scheduleError ? ' schedule-input--error' : ''}`}
            type="text"
            placeholder={
              form.scheduleType === 'interval' ? '3600000' :
              form.scheduleType === 'cron'     ? '0 8 * * 1' :
              '2026-12-01T09:00:00'
            }
            value={form.scheduleValue}
            onChange={(e) => setForm((f) => ({ ...f, scheduleValue: e.target.value }))}
          />
          <span className="schedule-hint">{scheduleHint}</span>
          {scheduleError && <span className="schedule-error" role="alert">{scheduleError}</span>}
        </div>

        <div className="schedule-field">
          <span className="schedule-label">Output Formats</span>
          <div className="schedule-formats">
            <label className="schedule-format-option">
              <input
                type="checkbox"
                checked={form.formatPdf}
                onChange={(e) => setForm((f) => ({ ...f, formatPdf: e.target.checked }))}
              />
              PDF
            </label>
            <label className="schedule-format-option">
              <input
                type="checkbox"
                checked={form.formatExcel}
                onChange={(e) => setForm((f) => ({ ...f, formatExcel: e.target.checked }))}
              />
              Excel (.xlsx)
            </label>
          </div>
        </div>

        <button type="submit" className="schedule-add-btn">
          Add Schedule
        </button>
      </form>
    </div>
  );
}

// ─── AI Insights tab ──────────────────────────────────────────

const insightEngineInstance = new InsightEngine();

const SEVERITY_COLOR: Record<string, string> = {
  info:     'var(--brand)',
  warning:  'var(--warning)',
  critical: 'var(--danger)',
};

const SEVERITY_BG: Record<string, string> = {
  info:     'var(--brand-50)',
  warning:  'var(--warning-light)',
  critical: 'var(--danger-light)',
};

function InsightCard({ insight }: { insight: Insight }) {
  const borderColor = SEVERITY_COLOR[insight.severity] ?? 'var(--brand)';
  const bgColor     = SEVERITY_BG[insight.severity]    ?? 'var(--brand-50)';

  return (
    <article
      className="insight-card"
      style={{ borderLeftColor: borderColor, background: bgColor }}
      aria-label={insight.title}
    >
      <div className="insight-card__header">
        <span
          className="insight-badge"
          style={{ background: borderColor }}
          aria-label={`Type: ${insight.type}`}
        >
          {insight.type}
        </span>
        <span
          className="insight-badge insight-badge--severity"
          style={{ background: borderColor }}
          aria-label={`Severity: ${insight.severity}`}
        >
          {insight.severity}
        </span>
        {insight.chartSuggestion && (
          <span className="insight-badge insight-badge--chart" aria-label={`Suggested chart: ${insight.chartSuggestion}`}>
            {insight.chartSuggestion}
          </span>
        )}
      </div>

      <h3 className="insight-card__title">{insight.title}</h3>
      <p className="insight-card__desc">{insight.description}</p>

      <div className="insight-card__footer">
        <div className="insight-card__confidence" aria-label={`Confidence: ${(insight.confidence * 100).toFixed(0)}%`}>
          <span className="insight-card__confidence-label">
            Confidence: {(insight.confidence * 100).toFixed(0)}%
          </span>
          <div className="insight-card__confidence-track" role="progressbar"
            aria-valuenow={insight.confidence * 100}
            aria-valuemin={0}
            aria-valuemax={100}>
            <div
              className="insight-card__confidence-bar"
              style={{ width: `${insight.confidence * 100}%`, background: borderColor }}
            />
          </div>
        </div>

        <span className="insight-card__cols">
          Columns: {insight.affectedColumns.join(', ')}
        </span>
      </div>
    </article>
  );
}

function AiInsightsTab() {
  const [result,  setResult]  = useState<InsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    setLoading(true);

    // Build a dataset from SALES_DATA for insight analysis
    const dataset = {
      id:         'sales-insights',
      name:       'Sales Data',
      columns:    [
        { id: 'revenue',               displayName: 'Revenue',              type: 'float' as const,     aggregatable: true,  dimensional: false, nullable: false },
        { id: 'profit',                displayName: 'Profit',               type: 'float' as const,     aggregatable: true,  dimensional: false, nullable: false },
        { id: 'profit_margin',         displayName: 'Profit Margin',        type: 'float' as const,     aggregatable: true,  dimensional: false, nullable: false },
        { id: 'units',                 displayName: 'Units Sold',           type: 'integer' as const,   aggregatable: true,  dimensional: false, nullable: false },
        { id: 'customer_satisfaction', displayName: 'Customer Satisfaction',type: 'float' as const,     aggregatable: true,  dimensional: false, nullable: false },
        { id: 'days_to_close',         displayName: 'Days to Close',        type: 'integer' as const,   aggregatable: true,  dimensional: false, nullable: false },
        { id: 'region',                displayName: 'Region',               type: 'string' as const,    aggregatable: false, dimensional: true,  nullable: false },
        { id: 'category',              displayName: 'Category',             type: 'string' as const,    aggregatable: false, dimensional: true,  nullable: false },
      ],
      rows:       SALES_DATA as unknown as Row[],
      source:     { id: 'src-sales', name: 'Sales Data', type: 'inline' as const, rowCount: SALES_DATA.length },
      createdAt:  new Date(),
      updatedAt:  new Date(),
    };

    insightEngineInstance
      .analyze(dataset, { maxInsights: 15, minConfidence: 0.3 })
      .then((r) => { setResult(r); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const visibleInsights = result?.insights.filter(
    (i: Insight) => filter === 'all' || i.severity === filter
  ) ?? [];

  const criticalCount = result?.insights.filter((i: Insight) => i.severity === 'critical').length ?? 0;
  const warningCount  = result?.insights.filter((i: Insight) => i.severity === 'warning').length  ?? 0;
  const infoCount     = result?.insights.filter((i: Insight) => i.severity === 'info').length     ?? 0;

  return (
    <section className="demo-section" aria-labelledby="insights-heading">
      <div className="demo-section-header">
        <h2 id="insights-heading">AI Insights</h2>
        <p>
          Zero-dependency pattern detection — no API key needed. Pure TypeScript statistics:
          linear regression, Z-score anomaly detection, Pearson correlation, segment analysis, and forecasting.
        </p>
      </div>

      {loading && (
        <div className="insights-loading" role="status" aria-live="polite">
          <span className="insights-loading__spinner" aria-hidden="true" />
          Analysing {SALES_DATA.length.toLocaleString()} records…
        </div>
      )}

      {error && (
        <div className="demo-error" role="alert">Analysis error: {error}</div>
      )}

      {result && (
        <>
          {/* Executive narrative */}
          <div className="insights-narrative" role="region" aria-label="Executive summary">
            <div className="insights-narrative__icon" aria-hidden="true">🤖</div>
            <div>
              <h3 className="insights-narrative__title">Executive Summary</h3>
              <p className="insights-narrative__text">{result.narrative}</p>
              <p className="insights-narrative__meta">
                Analysed {result.rowCount.toLocaleString()} rows × {result.columnCount} columns
                in {new Date(result.analyzedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Severity filter tabs */}
          <div className="insights-filter-tabs" role="tablist" aria-label="Filter insights by severity">
            {(['all', 'critical', 'warning', 'info'] as const).map((f) => {
              const count =
                f === 'all'      ? result.insights.length :
                f === 'critical' ? criticalCount :
                f === 'warning'  ? warningCount  : infoCount;
              return (
                <button
                  key={f}
                  role="tab"
                  className={`insights-filter-tab insights-filter-tab--${f}${filter === f ? ' insights-filter-tab--active' : ''}`}
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="insights-filter-tab__count">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Insight cards grid */}
          <div className="insights-grid" role="list" aria-label="Detected insights">
            {visibleInsights.length === 0 ? (
              <p className="insights-empty">No {filter === 'all' ? '' : filter} insights detected.</p>
            ) : (
              visibleInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Live Canvas tab ──────────────────────────────────────────

/** Stable canvas engine — created once outside the component */
const CANVAS_ENGINE = new CanvasEngine();

// Pre-place 3 widgets on first render
let _canvasBootstrapped = false;
function bootstrapCanvas() {
  if (_canvasBootstrapped) return;
  _canvasBootstrapped = true;
  CANVAS_ENGINE.addWidget('bar-chart',  { x: 40,  y: 60  }, { width: 380, height: 280 }, 'Revenue by Region');
  CANVAS_ENGINE.addWidget('kpi-card',   { x: 460, y: 60  }, { width: 220, height: 140 }, 'Total Revenue KPI');
  CANVAS_ENGINE.addWidget('pivot-table',{ x: 40,  y: 380 }, { width: 640, height: 320 }, 'Sales Pivot Table');
}
bootstrapCanvas();

/** Mini bar chart renderer for the canvas */
function BarChartRenderer({ widget: _widget }: { widget: CanvasWidget }) {
  // Simplified bar chart using CSS bars
  const bars = [
    { label: 'NA',   value: 78, color: '#6366f1' },
    { label: 'EU',   value: 62, color: '#8b5cf6' },
    { label: 'APAC', value: 55, color: '#ec4899' },
    { label: 'LATAM',value: 34, color: '#f59e0b' },
    { label: 'MEA',  value: 22, color: '#14b8a6' },
  ];
  return (
    <div className="canvas-bar-chart" aria-label="Revenue by Region bar chart">
      <div className="canvas-bar-chart__bars">
        {bars.map((b) => (
          <div key={b.label} className="canvas-bar-chart__bar-col">
            <div
              className="canvas-bar-chart__bar"
              style={{ height: `${b.value}%`, background: b.color }}
              title={`${b.label}: ${b.value}`}
              aria-label={`${b.label}: ${b.value}%`}
            />
            <span className="canvas-bar-chart__label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCardRenderer({ widget: _widget }: { widget: CanvasWidget }) {
  return (
    <div className="canvas-kpi-card">
      <div className="canvas-kpi-card__value">$4.2M</div>
      <div className="canvas-kpi-card__label">Total Revenue</div>
      <div className="canvas-kpi-card__trend canvas-kpi-card__trend--up">+12.4%</div>
    </div>
  );
}

function PivotRenderer({ widget: _widget }: { widget: CanvasWidget }) {
  return (
    <div className="canvas-pivot-placeholder">
      <table className="canvas-pivot-mini" aria-label="Sales pivot preview">
        <thead>
          <tr>
            <th>Region</th>
            <th>Software</th>
            <th>Hardware</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['NA',   '$1.2M', '$0.8M', '$2.0M'],
            ['EU',   '$0.9M', '$0.6M', '$1.5M'],
            ['APAC', '$0.7M', '$0.5M', '$1.2M'],
          ].map(([r, ...vals]) => (
            <tr key={r}>
              <td>{r}</td>
              {vals.map((v, i) => <td key={i}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CANVAS_RENDERERS = {
  'bar-chart':   BarChartRenderer,
  'kpi-card':    KpiCardRenderer,
  'pivot-table': PivotRenderer,
};

function LiveCanvasTab() {
  return (
    <section className="demo-section demo-section--canvas" aria-labelledby="canvas-heading">
      <div className="demo-section-header">
        <h2 id="canvas-heading">Live Canvas</h2>
        <p>
          Freeform drag-and-drop — place widgets anywhere, resize freely, snap to guides.
          Keyboard: <kbd>Del</kbd> delete, <kbd>Ctrl+D</kbd> duplicate, <kbd>Ctrl+Z</kbd> undo,
          <kbd>Ctrl+Y</kbd> redo, <kbd>Ctrl+Scroll</kbd> zoom.
        </p>
      </div>

      <DashboardCanvas
        engine={CANVAS_ENGINE}
        renderers={CANVAS_RENDERERS}
        className="demo-canvas"
      />
    </section>
  );
}
