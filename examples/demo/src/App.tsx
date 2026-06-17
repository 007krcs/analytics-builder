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

import { useEffect, useState } from 'react';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import type { KpiConfig, Row } from '@gridstorm/analytix-core';
import { computePivot as _computePivot } from '@gridstorm/analytix-pivot-engine';
import { computeKpi as _computeKpi }     from '@gridstorm/analytix-kpi-engine';
import {
  AnalyticsBuilder,
  KpiCard,
  useAnalyticsEngine,
  useKpi,
} from '@gridstorm/analytix-react';

// ── New differentiators ────────────────────────────────────────
import { CrossFilterProvider } from '@gridstorm/analytix-crossfilter';
import { DashboardCanvas, CanvasEngine } from '@gridstorm/analytix-canvas-layout';
import type { CanvasWidget } from '@gridstorm/analytix-canvas-layout';

import { SALES_DATA, EMPLOYEE_DATA, SALES_STATS } from './data/sample-data.js';
import { SqlEditor } from '@gridstorm/analytix-sql-connector';
import { MARKETPLACE_PLUGINS, searchPlugins } from '@gridstorm/analytix-core';
import type { MarketplacePlugin } from '@gridstorm/analytix-core';
import { fetchGoogleSheet, parseExcelFile } from '@gridstorm/analytix-data-connector';
import { CollaborativeDashboard } from '@gridstorm/analytix-react';
import { AIInsightsPanel } from './AIInsightsPanel.js';
import { AskPanel } from './AskPanel.js';
import { SentinelPanel } from './SentinelPanel.js';
import LandingPage from './LandingPage.js';

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

// Previous-period comparison values (simulating prior-quarter actuals)
const KPI_REVENUE_PREV   = Math.round(SALES_STATS.totalRevenue   * 0.88);
const KPI_PROFIT_PREV    = Math.round(SALES_STATS.totalProfit    * 0.82);
const KPI_SAT_PREV       = 3.9;
const KPI_UNITS_PREV     = Math.round(SALES_STATS.totalUnits     * 0.91);

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

// ─── Tab config ───────────────────────────────────────────────

type DemoTab = 'ask' | 'sentinel' | 'pivot' | 'charts' | 'kpis' | 'reports' | 'insights' | 'canvas' | 'docs' | 'sql' | 'marketplace' | 'connectors' | 'collaborate';

const TAB_CONFIG: Array<{ id: DemoTab; label: string; icon: string }> = [
  { id: 'ask',         label: 'Ask your data',    icon: '✨' },
  { id: 'sentinel',    label: 'Sentinel',         icon: '✦' },
  { id: 'pivot',       label: 'Pivot Builder',    icon: '⊞' },
  { id: 'charts',      label: 'Chart Builder',    icon: '📊' },
  { id: 'kpis',        label: 'KPI Dashboard',    icon: '📈' },
  { id: 'reports',     label: 'Report Scheduler', icon: '📄' },
  { id: 'insights',    label: 'AI Insights',      icon: '🤖' },
  { id: 'canvas',      label: 'Live Canvas',      icon: '🎨' },
  { id: 'sql',         label: 'SQL Query',        icon: '🗄️' },
  { id: 'connectors',  label: 'Connectors',       icon: '🔌' },
  { id: 'collaborate', label: 'Collaborate',      icon: '💬' },
  { id: 'marketplace', label: 'Marketplace',      icon: '🏪' },
  { id: 'docs',        label: 'How It Works',     icon: '📖' },
];

// ─── Root App ─────────────────────────────────────────────────

type View = 'landing' | 'app';

export default function App() {
  // The marketing landing page is the default. Hash routing lets
  // ?# or #demo deep-link straight into the demo, e.g. shared links from sales.
  const initialView: View =
    typeof window !== 'undefined' && /^#(demo|app)/.test(window.location.hash)
      ? 'app'
      : 'landing';

  const [view, setView] = useState<View>(initialView);
  const [activeTab, setActiveTab] = useState<DemoTab>('ask');
  const { engine, loadDataset, version: _version } = useAnalyticsEngine();

  useEffect(() => {
    loadDataset('sales',     'Sales Data',    SALES_DATA    as unknown as Row[]);
    loadDataset('employees', 'Employee Data', EMPLOYEE_DATA as unknown as Row[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = view === 'app' ? '#demo' : '';
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', `${window.location.pathname}${target}`);
    }
  }, [view]);

  if (view === 'landing') {
    return <LandingPage onLaunch={() => { setView('app'); window.scrollTo({ top: 0 }); }} />;
  }

  const salesDataset = engine.getDataset('sales') ?? undefined;

  return (
    <div className="app">

      {/* ── Back-to-landing bar ─────────────────────────────── */}
      <div className="lp-back-bar" role="region" aria-label="Demo session header">
        <div className="lp-back-bar__brand">
          <span className="lp-nav__logo lp-nav__logo--sm" aria-hidden="true">A</span>
          <span>Analytix — interactive demo</span>
        </div>
        <button
          className="lp-back-bar__btn"
          onClick={() => { setView('landing'); window.scrollTo({ top: 0 }); }}
          aria-label="Return to product overview"
        >
          ← Back to overview
        </button>
      </div>

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

        {activeTab === 'ask' && salesDataset && (
          <AskPanel dataset={salesDataset} />
        )}

        {activeTab === 'sentinel' && (
          <SentinelPanel />
        )}

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

        {activeTab === 'sql' && (
          <SqlQueryTab engine={engine} />
        )}

        {activeTab === 'connectors' && (
          <ConnectorsTab engine={engine} />
        )}

        {activeTab === 'collaborate' && (
          <CollaborateTab engine={engine} />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceTab />
        )}

        {activeTab === 'docs' && (
          <DocsTab />
        )}

      </main>
    </div>
  );
}

// ─── Pivot Builder tab ────────────────────────────────────────

function PivotBuilderTab({ engine }: { engine: AnalyticsEngine }) {
  const salesDataset = engine.getDataset('sales') ?? undefined;
  return (
    <section className="demo-section demo-section--builder" aria-labelledby="pivot-heading">
      <div className="demo-section-header">
        <h2 id="pivot-heading">Pivot Builder</h2>
        <p>
          Drag fields from the left panel into Rows, Columns, and Values to build any pivot
          table. Pre-loaded with Region &times; Category &#8594; Revenue. Add more fields,
          change aggregations, or switch to Charts.
        </p>
      </div>
      <AnalyticsBuilder
        engine={engine}
        initialDataset={salesDataset}
        onExport={(fmt: string) =>
          alert(
            `Export as ${fmt.toUpperCase()} — integrate @gridstorm/analytix-report-builder for full PDF/Excel generation.`
          )
        }
      />
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
    <section className="demo-section demo-section--builder" aria-labelledby="charts-heading">
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
            `Export as ${fmt.toUpperCase()} — integrate @gridstorm/analytix-report-builder for full PDF/Excel generation.`
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

  const kpis: Array<{ config: KpiConfig; result: ReturnType<typeof useKpi>['result']; prev: number }> = [
    { config: KPI_REVENUE,          result: revenueResult,      prev: KPI_REVENUE_PREV  },
    { config: KPI_PROFIT,           result: profitResult,       prev: KPI_PROFIT_PREV   },
    { config: KPI_AVG_SATISFACTION, result: satisfactionResult, prev: KPI_SAT_PREV      },
    { config: KPI_UNITS,            result: unitsResult,        prev: KPI_UNITS_PREV    },
  ];

  return (
    <section className="demo-section" aria-labelledby="kpi-heading">
      <div className="demo-section-header">
        <h2 id="kpi-heading">KPI Dashboard</h2>
        <p>
          Key metrics computed from {SALES_DATA.length.toLocaleString()} sales records.
          Border colour reflects threshold status: green = good, yellow = warning, red = critical.
          Arrows show period-over-period delta vs. prior quarter.
        </p>
      </div>

      <article aria-label="KPI cards">
        <div className="kpi-demo-grid">
          {kpis.map(({ config, result, prev }) => (
            <KpiCard
              key={config.id}
              config={config}
              result={result}
              size="medium"
              variant="default"
              previousPeriodValue={prev}
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
          <h3>@gridstorm/analytix-report-builder</h3>
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

// Build the demo dataset once (same shape as the engine expects)
const INSIGHTS_DATASET = {
  id:        'sales-insights',
  name:      'Sales Data',
  columns: [
    { id: 'revenue',               displayName: 'Revenue',               type: 'float'   as const, aggregatable: true,  dimensional: false, nullable: false },
    { id: 'profit',                displayName: 'Profit',                type: 'float'   as const, aggregatable: true,  dimensional: false, nullable: false },
    { id: 'profit_margin',         displayName: 'Profit Margin',         type: 'float'   as const, aggregatable: true,  dimensional: false, nullable: false },
    { id: 'units',                 displayName: 'Units Sold',            type: 'integer' as const, aggregatable: true,  dimensional: false, nullable: false },
    { id: 'customer_satisfaction', displayName: 'Customer Satisfaction', type: 'float'   as const, aggregatable: true,  dimensional: false, nullable: false },
    { id: 'days_to_close',         displayName: 'Days to Close',         type: 'integer' as const, aggregatable: true,  dimensional: false, nullable: false },
    { id: 'region',                displayName: 'Region',                type: 'string'  as const, aggregatable: false, dimensional: true,  nullable: false },
    { id: 'category',              displayName: 'Category',              type: 'string'  as const, aggregatable: false, dimensional: true,  nullable: false },
  ],
  rows:      SALES_DATA as unknown as Row[],
  source:    { id: 'src-sales', name: 'Sales Data', type: 'inline' as const, rowCount: SALES_DATA.length },
  createdAt: new Date(),
  updatedAt: new Date(),
};

function AiInsightsTab() {
  return (
    <section className="demo-section" aria-labelledby="insights-heading">
      <div className="demo-section-header">
        <h2 id="insights-heading">AI Insights</h2>
        <p>
          <strong>Left:</strong> zero-dependency pure TypeScript statistics — runs locally, no API key needed.{' '}
          <strong>Right:</strong> Claude claude-opus-4-6 interprets those findings with business context,
          executive summaries, and actionable recommendations (enter your Anthropic API key to enable).
        </p>
      </div>
      <AIInsightsPanel dataset={INSIGHTS_DATASET as unknown as import('@gridstorm/analytix-core').Dataset} />
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

// ─── SQL Query tab ────────────────────────────────────────────

function SqlQueryTab({ engine }: { engine: AnalyticsEngine }) {
  const [sqlResults, setSqlResults] = useState<Row[] | null>(null);
  const SAMPLE_SQL =
    'SELECT region, SUM(revenue) AS total_revenue, COUNT(*) AS deals\n' +
    'FROM sales\n' +
    'GROUP BY region\n' +
    'ORDER BY total_revenue DESC';

  return (
    <section className="demo-section" aria-labelledby="sql-heading">
      <div className="demo-section-header">
        <h2 id="sql-heading">SQL Query</h2>
        <p>
          Query your datasets with SQL — no server required. Uses a pure-JS in-browser
          engine supporting SELECT, FROM, WHERE, GROUP BY, ORDER BY, and LIMIT.
          <br />
          <strong>Quick start:</strong> Import the &ldquo;sales&rdquo; dataset then run the sample query below.
        </p>
      </div>

      <div className="sql-editor-wrapper">
        <SqlEditor
          engine={engine}
          initialSql={SAMPLE_SQL}
          onResult={(rows) => setSqlResults(rows)}
        />
      </div>

      {sqlResults !== null && sqlResults.length > 0 && (
        <div className="sql-results-summary" aria-live="polite">
          <span className="sql-results-badge">
            {sqlResults.length} row{sqlResults.length !== 1 ? 's' : ''} returned
          </span>
        </div>
      )}
    </section>
  );
}

// ─── Marketplace tab ──────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  chart: '📊 Charts',
  connector: '🔌 Connectors',
  transform: '⚡ Transforms',
  export: '📤 Export',
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free:       { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  pro:        { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  enterprise: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
};

function PluginCard({ plugin }: { plugin: MarketplacePlugin }) {
  const tier = TIER_COLORS[plugin.tier] ?? TIER_COLORS.free;
  const stars = '★'.repeat(Math.round(plugin.rating)) + '☆'.repeat(5 - Math.round(plugin.rating));

  return (
    <article
      className="marketplace-card"
      aria-label={`${plugin.name} plugin`}
    >
      <div className="marketplace-card-header">
        <div className="marketplace-card-meta">
          <span
            className="marketplace-tier-badge"
            style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}
          >
            {plugin.tier.toUpperCase()}
          </span>
          <span className="marketplace-category-badge">
            {CATEGORY_LABELS[plugin.category] ?? plugin.category}
          </span>
        </div>
        <div className="marketplace-card-rating" aria-label={`Rating: ${plugin.rating} out of 5`}>
          <span className="marketplace-stars">{stars}</span>
          <span className="marketplace-rating-num">{plugin.rating.toFixed(1)}</span>
        </div>
      </div>

      <h3 className="marketplace-card-name">{plugin.name}</h3>
      <p className="marketplace-card-desc">{plugin.description}</p>

      <div className="marketplace-card-tags">
        {plugin.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="marketplace-tag">{tag}</span>
        ))}
      </div>

      <div className="marketplace-card-footer">
        <span className="marketplace-card-author">by {plugin.author}</span>
        <span className="marketplace-card-installs">
          {plugin.installs >= 1000
            ? `${(plugin.installs / 1000).toFixed(1)}k installs`
            : `${plugin.installs} installs`}
        </span>
        <span className="marketplace-card-version">v{plugin.version}</span>
      </div>

      {plugin.downloadUrl ? (
        <a
          href={plugin.downloadUrl}
          className="marketplace-install-btn"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Install ${plugin.name}`}
        >
          Install
        </a>
      ) : (
        <button
          className="marketplace-install-btn"
          onClick={() => alert(`pnpm add ${plugin.id}\n\nFull registry coming soon!`)}
          aria-label={`Install ${plugin.name}`}
        >
          Install
        </button>
      )}
    </article>
  );
}

function MarketplaceTab() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const filtered = searchPlugins(query, category || undefined);
  const categories = Array.from(new Set(MARKETPLACE_PLUGINS.map((p) => p.category)));

  return (
    <section className="demo-section" aria-labelledby="marketplace-heading">
      <div className="demo-section-header">
        <h2 id="marketplace-heading">Plugin Marketplace</h2>
        <p>
          Extend Analytix with community and official plugins. Charts, connectors,
          data transforms, and export formats — install any plugin with one command.
        </p>
      </div>

      {/* Search + filter toolbar */}
      <div className="marketplace-toolbar" role="search" aria-label="Search plugins">
        <input
          type="search"
          className="marketplace-search"
          placeholder="Search plugins…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search plugins by name, description, or tags"
        />
        <select
          className="marketplace-category-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat] ?? cat}</option>
          ))}
        </select>
        <span className="marketplace-count" aria-live="polite">
          {filtered.length} plugin{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Plugin grid */}
      <div className="marketplace-grid" role="list" aria-label="Available plugins">
        {filtered.length === 0 ? (
          <p className="marketplace-empty">No plugins match your search.</p>
        ) : (
          filtered.map((plugin) => (
            <div key={plugin.id} role="listitem">
              <PluginCard plugin={plugin} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Docs tab ─────────────────────────────────────────────────

function DocsTab() {
  return (
    <section className="demo-section" aria-labelledby="docs-heading">

      {/* Hero */}
      <div className="docs-hero">
        <h2 className="docs-hero-title" id="docs-heading">Analytix — Drag-and-drop analytics builder</h2>
        <p className="docs-hero-subtitle">No SQL. No BI admin. Embeds in React like a date picker.</p>
        <div className="docs-hero-badges">
          <span className="docs-hero-badge">📊 1,200 demo rows loaded</span>
          <span className="docs-hero-badge">⚡ 6 live features above</span>
          <span className="docs-hero-badge">🔒 All data stays in your browser</span>
          <span className="docs-hero-badge">🆓 MIT — $0/developer</span>
        </div>
      </div>

      {/* 5-step quick tour */}
      <h3 className="docs-section-title">5-Step Quick Tour</h3>
      <div className="docs-steps">
        {[
          {
            icon: '⊞',
            title: 'Pivot Builder tab — drag fields to build any pivot table',
            desc: 'The table is pre-loaded with Region → Rows, Category → Columns, Revenue → Values. You can see real aggregated data immediately.',
            tip: 'Try it: drag "Channel" from the Fields panel on the left into the "Columns" drop zone. The pivot re-computes instantly.',
          },
          {
            icon: '📊',
            title: 'Chart Builder tab — 26 chart types, zero configuration',
            desc: 'A Revenue by Region bar chart auto-renders when you open the tab. Change the X/Y fields using the dropdowns, or switch chart types.',
            tip: 'Try it: switch to Line chart and set X = Quarter, Y = Revenue to see a time-series trend.',
          },
          {
            icon: '📈',
            title: 'KPI Dashboard — live threshold alerts from 1,200 rows',
            desc: 'Four metric cards compute from the full dataset. Border colour reflects threshold status: green = on track, yellow = warning, red = critical.',
            tip: 'These update in real time whenever the dataset changes — no manual refresh needed.',
          },
          {
            icon: '🤖',
            title: 'AI Insights — no API key, no network call',
            desc: 'Five detectors run locally in pure TypeScript: Trend (monotonic patterns), Anomaly (Z-score + IQR), Correlation (Pearson r), Segment (dominant groups), and Forecast (linear regression).',
            tip: 'Try it: click "Run Analysis" — you\'ll get plain-English insights with confidence scores in under 200ms.',
          },
          {
            icon: '🎨',
            title: 'Live Canvas — freeform dashboard layout with undo/redo',
            desc: 'Three pre-placed widgets on a freeform canvas. Drag them anywhere, resize from the corners, or lock them in place.',
            tip: 'Try it: move a widget then click "Undo". The canvas has a 20-step history.',
          },
        ].map((step, i) => (
          <div key={i} className="docs-step">
            <div className="docs-step-num">{i + 1}</div>
            <div className="docs-step-body">
              <p className="docs-step-title">{step.icon} {step.title}</p>
              <p className="docs-step-desc">{step.desc}</p>
              <p className="docs-step-tip">💡 {step.tip}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Competitive comparison */}
      <h3 className="docs-section-title">How Analytix compares</h3>
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table className="docs-compare-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Analytix</th>
              <th>Tableau</th>
              <th>Power BI</th>
              <th>Metabase</th>
              <th>Superset</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Open source',                   '✅',         '❌',       '❌',       '✅',         '✅'        ],
              ['Embeds in React (native)',       '✅ native',  '❌',       '⚠️ iframe', '⚠️ iframe', '⚠️ iframe'],
              ['No SQL required',               '✅',         '❌',       '❌',       '❌',         '❌'        ],
              ['AI insights (offline)',         '✅ built-in','❌',       '⚠️ paid',  '❌',         '❌'        ],
              ['WebSocket live data',           '✅',         '❌',       '❌',       '❌',         '❌'        ],
              ['Freeform canvas layout',        '✅',         '✅',       '✅',       '❌',         '❌'        ],
              ['Cross-widget filtering',        '✅',         '✅',       '✅',       '⚠️ limited', '⚠️ limited'],
              ['Zero backend / server',         '✅',         '❌',       '❌',       '❌ server',  '❌ server' ],
              ['Price (per developer)',         '$0 MIT',    '$999/yr',  '$10/usr/mo','$500/mo',  'self-host' ],
            ].map(([feature, ...cols]) => (
              <tr key={feature}>
                <td>{feature}</td>
                {cols.map((val, i) => <td key={i}>{val}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="docs-highlights">
        <div className="docs-highlight docs-highlight--green">
          <p className="docs-highlight-title">🟢 Zero cost, full control</p>
          <p className="docs-highlight-desc">MIT licensed. No vendor lock-in, no seat fees, no annual contracts. Self-host on your own infra or deploy to Vercel in &lt;40 seconds.</p>
        </div>
        <div className="docs-highlight docs-highlight--yellow">
          <p className="docs-highlight-title">🟡 No SQL, no backend</p>
          <p className="docs-highlight-desc">Connect a CSV, WebSocket feed, or REST API — data never leaves the browser. No database credentials, no query editor, no data warehouse.</p>
        </div>
        <div className="docs-highlight docs-highlight--blue">
          <p className="docs-highlight-title">🔵 Built-in AI (ahead of the market)</p>
          <p className="docs-highlight-desc">Trend, anomaly, correlation, segment, and forecast detectors run locally in TypeScript — no OpenAI key, no Gemini, no third-party API call ever.</p>
        </div>
      </div>

      {/* Architecture */}
      <h3 className="docs-section-title">Package architecture</h3>
      <div className="docs-arch">
        <div className="docs-arch-layer">
          <div className="docs-arch-layer-label">React UI Layer</div>
          <div className="docs-arch-boxes">
            {['AnalyticsBuilder', 'PivotBuilder', 'ChartBuilder', 'KpiCard', 'KpiDashboard', 'FieldPanel', 'DropZone', 'DashboardCanvas'].map(c => (
              <span key={c} className="docs-arch-box">{c}</span>
            ))}
          </div>
        </div>
        <div className="docs-arch-arrow">↓ &nbsp;@gridstorm/analytix-react</div>
        <div className="docs-arch-layer">
          <div className="docs-arch-layer-label">Core Orchestrator</div>
          <div className="docs-arch-boxes">
            {['AnalyticsEngine', 'EventBus', 'buildDataset', 'PivotConfig', 'KpiConfig', 'ReportConfig'].map(c => (
              <span key={c} className="docs-arch-box docs-arch-box--core">{c}</span>
            ))}
          </div>
        </div>
        <div className="docs-arch-arrow">↓ &nbsp;@gridstorm/analytix-core</div>
        <div className="docs-arch-layer">
          <div className="docs-arch-layer-label">Specialized Engines (zero dependencies between them)</div>
          <div className="docs-arch-boxes">
            {['pivot-engine', 'chart-engine', 'kpi-engine', 'insight-engine', 'data-connector', 'canvas-layout', 'crossfilter', 'report-builder'].map(c => (
              <span key={c} className="docs-arch-box docs-arch-box--engine">@analytix/{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Code examples */}
      <h3 className="docs-section-title">Code examples</h3>
      <div className="docs-code-examples">
        <details className="docs-code-block">
          <summary>Minimal setup — 3 lines to embed the full builder</summary>
          <pre>{`import { AnalyticsEngine } from '@gridstorm/analytix-core';
import { computePivot }    from '@gridstorm/analytix-pivot-engine';
import { computeKpi }      from '@gridstorm/analytix-kpi-engine';
import { parseCsv }        from '@gridstorm/analytix-data-connector';
import { AnalyticsBuilder } from '@gridstorm/analytix-react';

// 1. Create engine + wire sub-engines
const engine = new AnalyticsEngine();
engine.registerPivotEngine(computePivot);
engine.registerKpiEngine(computeKpi);

// 2. Load your data
const dataset = await parseCsv(csvText, { id: 'sales', name: 'Sales' });
engine.addDataset(dataset);

// 3. Embed — pre-populates region/category/revenue by default
export default function App() {
  return <AnalyticsBuilder engine={engine} initialDataset={dataset} />;
}`}</pre>
        </details>

        <details className="docs-code-block">
          <summary>Standalone pivot table — use without the full builder UI</summary>
          <pre>{`import { AnalyticsEngine } from '@gridstorm/analytix-core';
import { computePivot }    from '@gridstorm/analytix-pivot-engine';
import { PivotTable }      from '@gridstorm/analytix-react';
import { usePivot }        from '@gridstorm/analytix-react';

const config = {
  id: 'revenue-pivot',
  datasetId: 'sales',
  rowFields:    ['region'],
  columnFields: ['quarter'],
  valueFields:  [
    { columnId: 'revenue', aggregation: 'sum', label: 'Revenue ($)' },
  ],
  showRowTotals:    true,
  showColumnTotals: true,
};

function MyPivot({ engine }) {
  const { result, loading } = usePivot(engine, config);
  if (loading) return <p>Computing...</p>;
  return <PivotTable result={result} />;
}`}</pre>
        </details>

        <details className="docs-code-block">
          <summary>AI Insights — zero-dependency analysis, no API key</summary>
          <pre>{`import { InsightEngine } from '@gridstorm/analytix-insight-engine';

const engine = new InsightEngine();

const result = await engine.analyze(dataset, {
  detectors:     ['trend', 'anomaly', 'correlation', 'forecast'],
  maxInsights:   10,
  minConfidence: 0.5,
});

// Each insight:
// {
//   type:        'trend-up',
//   title:       'Revenue growing strongly',
//   description: 'Monthly revenue has increased 23% over 6 periods.',
//   severity:    'info',
//   confidence:  0.91,
//   chartSuggestion: 'line',
// }

console.log(result.narrative);
// "Revenue is growing strongly (+23% over 6 periods). CAC shows
//  an anomalous spike in March (2.4\u03c3 above mean). Revenue and NRR
//  are strongly correlated (r = 0.87)."
`}</pre>
        </details>

        <details className="docs-code-block">
          <summary>Cross-widget filtering — click a bar to filter all other charts</summary>
          <pre>{`import { CrossFilterProvider, useCrossFilter } from '@gridstorm/analytix-crossfilter';

// 1. Wrap your dashboard in CrossFilterProvider
function Dashboard({ dataset }) {
  return (
    <CrossFilterProvider>
      <RevenueBar  datasetId={dataset.id} rows={dataset.rows} />
      <RegionPie   datasetId={dataset.id} rows={dataset.rows} />
      <SalesTable  datasetId={dataset.id} rows={dataset.rows} />
    </CrossFilterProvider>
  );
}

// 2. Each widget subscribes — gets all OTHER widgets' filters applied
function RevenueBar({ datasetId, rows }) {
  const { filteredRows, setFilter, clearFilter, isFiltered } =
    useCrossFilter('widget-bar', datasetId, rows);

  return (
    <BarChart
      data={filteredRows}        // auto-filtered by other widgets
      onBarClick={(bar) => setFilter('region', [bar.region])}
      onBackgroundClick={clearFilter}
      style={{ opacity: isFiltered ? 1 : 0.75 }}
    />
  );
}`}</pre>
        </details>
      </div>

      {/* AI provider setup + production deployment */}
      <h3 className="docs-section-title">AI Analysis — Setup Guide</h3>
      <div className="docs-code-examples">

        <details className="docs-code-block" open>
          <summary>🦙 Option A — Ollama (Free, local, private)</summary>
          <pre>{`# 1. Install Ollama
#    macOS:
brew install ollama
#    Linux:
curl -fsSL https://ollama.com/install.sh | sh
#    Windows: download the installer from https://ollama.com

# 2. Pull a model (one-time download)
ollama pull llama3.2        # ~2 GB — recommended
ollama pull mistral         # ~4 GB — higher quality
ollama pull phi3            # ~2 GB — fast & small
ollama pull qwen2.5         # ~4 GB — multilingual

# 3. Start the server
ollama serve                # runs on http://localhost:11434

# 4. Use it in the AI Insights tab
#    Select "Ollama (Free)" as provider → click Analyse.
#    No API key needed. Data never leaves your machine.

# Tip: Ollama only allows connections from localhost by default.
# If you deploy the app to production, users must run Ollama locally.
# You can change OLLAMA_HOST to allow other origins if needed:
OLLAMA_HOST=0.0.0.0 ollama serve`}</pre>
        </details>

        <details className="docs-code-block">
          <summary>🤖 Option B — Claude (Anthropic API, cloud)</summary>
          <pre>{`# 1. Create an Anthropic account at console.anthropic.com
# 2. Go to API Keys → Create Key
# 3. Copy the key (starts with sk-ant-api03-...)

# 4. Paste it into the AI Insights tab → "Anthropic API Key" field.
#    The key is saved in localStorage on your device only.

# Model pricing (per analysis run, ~2k tokens in + ~1k out):
#   claude-haiku-4-5  — ~$0.004   Fastest, great for quick reports
#   claude-sonnet-4-6 — ~$0.025   Balanced quality/cost
#   claude-opus-4-6   — ~$0.050   Highest quality reasoning

# Prompt caching is enabled automatically — if you run analysis
# multiple times on the same dataset the system instructions are
# read from cache (~10× cheaper on repeated runs).

# For production use, set the API key as an environment variable:
#   VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
# Then load it in your app:
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';`}</pre>
        </details>

        <details className="docs-code-block">
          <summary>☁️ Production deployment — Vercel (recommended)</summary>
          <pre>{`# Prerequisites: Node 18+, pnpm, a Vercel account

# 1. Build the demo
cd analytics-builder
pnpm install
pnpm -r build            # builds all workspace packages first
cd examples/demo
pnpm build               # outputs to examples/demo/dist/

# 2. Deploy to Vercel (one command)
npx vercel --prod        # follow the prompts

# Or connect your GitHub repo to Vercel for automatic deploys:
#   vercel.com → New Project → Import Git Repository

# 3. Add environment variables in Vercel dashboard:
#   VITE_ANTHROPIC_API_KEY  (optional — users can also enter their own)
#
# Vercel → Project Settings → Environment Variables → Add

# vercel.json (place in examples/demo/):
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}`}</pre>
        </details>

        <details className="docs-code-block">
          <summary>🐳 Production deployment — Docker</summary>
          <pre>{`# Dockerfile (place in examples/demo/):
FROM node:20-alpine AS builder
WORKDIR /app

# Copy monorepo root
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ packages/
COPY examples/demo/ examples/demo/

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm -r build && cd examples/demo && pnpm build

FROM nginx:alpine
COPY --from=builder /app/examples/demo/dist /usr/share/nginx/html
COPY examples/demo/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# nginx.conf:
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
  gzip on;
  gzip_types text/css application/javascript application/json;
}

# Build and run:
docker build -t analytix-demo .
docker run -p 8080:80 analytix-demo`}</pre>
        </details>

        <details className="docs-code-block">
          <summary>🔒 Security — API key handling in production</summary>
          <pre>{`// Option 1: User supplies their own key (current demo approach)
// Key stored in localStorage — never sent to your server.
// Each user pays for their own usage. Zero backend required.

// Option 2: Server-side proxy (recommended for team deployments)
// Create a lightweight API route that holds your key server-side:

// pages/api/analyse.ts  (Next.js example)
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { dataset, result } = await req.json();
  // Add your own auth / rate-limit checks here
  const stream = client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(dataset, result) }],
  });
  // Return as Server-Sent Events
  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// Rate limiting recommendations:
// - 10 requests / user / day for free tier
// - Track usage in Redis / Upstash
// - Use Anthropic's usage reports at console.anthropic.com/usage`}</pre>
        </details>
      </div>

      {/* Roadmap */}
      <h3 className="docs-section-title">Shipped — Q1 2026</h3>
      <div className="docs-roadmap">
        <div className="docs-roadmap-items">
          {[
            'Google Sheets connector — fetch public sheets via CSV export URL',
            'Excel (.xlsx) connector — read spreadsheet files with SheetJS',
            'Collaborative dashboards — shareable URLs + comment threads',
            'Mobile-responsive layout — media queries for phones and tablets',
            'SQL connector — DuckDB WASM, query CSV/Parquet with SQL',
            'Plugin marketplace — community chart types and connectors',
            '@gridstorm/analytix-vue and @gridstorm/analytix-svelte adapter packages',
            'WCAG 2.1 AA accessibility audit and compliance',
            'Native time-series axis with zoom and pan gestures',
            'Snapshot alerts — compare KPI values across periods',
          ].map((item) => (
            <div key={item} className="docs-roadmap-item">
              <div className="docs-roadmap-check" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

// ─── Connectors tab ───────────────────────────────────────────

function ConnectorsTab({ engine }: { engine: AnalyticsEngine }) {
  const [sheetsUrl,    setSheetsUrl]    = useState('');
  const [sheetsStatus, setSheetsStatus] = useState<string | null>(null);
  const [sheetsError,  setSheetsError]  = useState<string | null>(null);

  const [excelFile,    setExcelFile]    = useState<File | null>(null);
  const [excelStatus,  setExcelStatus]  = useState<string | null>(null);
  const [excelError,   setExcelError]   = useState<string | null>(null);

  async function handleSheetsLoad() {
    if (!sheetsUrl.trim()) return;
    setSheetsStatus('Fetching…');
    setSheetsError(null);
    try {
      const ds = await fetchGoogleSheet(sheetsUrl.trim(), { datasetName: 'Google Sheet' });
      engine.addDataset(ds);
      setSheetsStatus(`Loaded ${ds.source.rowCount.toLocaleString()} rows · ${ds.columns.length} columns`);
    } catch (err) {
      setSheetsError(String(err));
      setSheetsStatus(null);
    }
  }

  async function handleExcelLoad() {
    if (!excelFile) return;
    setExcelStatus('Parsing…');
    setExcelError(null);
    try {
      const ds = await parseExcelFile(excelFile, { datasetName: excelFile.name.replace(/\.[^.]+$/, '') });
      engine.addDataset(ds);
      setExcelStatus(`Loaded ${ds.source.rowCount.toLocaleString()} rows · ${ds.columns.length} columns`);
    } catch (err) {
      setExcelError(String(err));
      setExcelStatus(null);
    }
  }

  return (
    <section className="demo-section" aria-labelledby="connectors-heading">
      <div className="demo-section-header">
        <h2 id="connectors-heading">Data Connectors</h2>
        <p>
          Import data from Google Sheets, Excel files, CSV, REST APIs, and WebSockets.
          Loaded datasets appear in all other tabs.
        </p>
      </div>

      <div className="connectors-grid">

        {/* Google Sheets */}
        <div className="connector-card">
          <div className="connector-card-header">
            <span className="connector-icon">📊</span>
            <h3>Google Sheets</h3>
          </div>
          <p className="connector-desc">
            Paste any public Google Sheets URL. The sheet is fetched as CSV — no OAuth required.
          </p>
          <div className="connector-form">
            <input
              className="connector-input"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              aria-label="Google Sheets URL"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSheetsLoad(); }}
            />
            <button className="connector-btn" onClick={handleSheetsLoad} disabled={!sheetsUrl.trim()}>
              Load Sheet
            </button>
          </div>
          {sheetsStatus && <p className="connector-status connector-status--ok">{sheetsStatus}</p>}
          {sheetsError  && <p className="connector-status connector-status--err">{sheetsError}</p>}
          <p className="connector-hint">
            The sheet must be shared publicly ("Anyone with the link can view").
          </p>
        </div>

        {/* Excel */}
        <div className="connector-card">
          <div className="connector-card-header">
            <span className="connector-icon">📗</span>
            <h3>Excel / XLSX</h3>
          </div>
          <p className="connector-desc">
            Drop an <code>.xlsx</code> or <code>.xls</code> file. All columns and data types
            are inferred automatically.
          </p>
          <div className="connector-form">
            <label className="connector-file-label">
              <input
                type="file"
                accept=".xlsx,.xls,.ods"
                style={{ display: 'none' }}
                onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
              />
              {excelFile ? excelFile.name : 'Choose .xlsx file…'}
            </label>
            <button className="connector-btn" onClick={handleExcelLoad} disabled={!excelFile}>
              Load File
            </button>
          </div>
          {excelStatus && <p className="connector-status connector-status--ok">{excelStatus}</p>}
          {excelError  && <p className="connector-status connector-status--err">{excelError}</p>}
        </div>

        {/* CSV (already exists — just info card) */}
        <div className="connector-card connector-card--info">
          <div className="connector-card-header">
            <span className="connector-icon">📄</span>
            <h3>CSV / TSV</h3>
          </div>
          <p className="connector-desc">
            Drag &amp; drop a CSV file onto the Pivot Builder or Chart Builder tab.
            Auto-detects delimiter, header row, and column types.
          </p>
          <span className="connector-badge">Available in all builder tabs</span>
        </div>

        {/* REST API */}
        <div className="connector-card connector-card--info">
          <div className="connector-card-header">
            <span className="connector-icon">🌐</span>
            <h3>REST API</h3>
          </div>
          <p className="connector-desc">
            Fetch JSON from any public endpoint with <code>fetchRestApi()</code>. Supports
            auto-pagination, custom headers, and periodic refresh.
          </p>
          <span className="connector-badge">@gridstorm/analytix-data-connector</span>
        </div>

        {/* WebSocket */}
        <div className="connector-card connector-card--info">
          <div className="connector-card-header">
            <span className="connector-icon">⚡</span>
            <h3>WebSocket (Real-time)</h3>
          </div>
          <p className="connector-desc">
            Stream live data with <code>connectWebSocket()</code>. Supports JSON/NDJSON framing,
            automatic reconnection, and visibility-aware pause.
          </p>
          <span className="connector-badge">Live in Canvas tab</span>
        </div>

        {/* SQL */}
        <div className="connector-card connector-card--info">
          <div className="connector-card-header">
            <span className="connector-icon">🗄️</span>
            <h3>SQL (In-browser)</h3>
          </div>
          <p className="connector-desc">
            Run SELECT queries over any loaded dataset using the pure-JS SQL engine.
            Supports WHERE, GROUP BY, ORDER BY, and aggregate functions.
          </p>
          <span className="connector-badge">SQL Query tab</span>
        </div>

      </div>
    </section>
  );
}

// ─── Collaborate tab ──────────────────────────────────────────

function CollaborateTab({ engine }: { engine: AnalyticsEngine }) {
  const { result: revenueResult }      = useKpi(engine, KPI_REVENUE);
  const { result: profitResult }       = useKpi(engine, KPI_PROFIT);
  const { result: satisfactionResult } = useKpi(engine, KPI_AVG_SATISFACTION);
  const { result: unitsResult }        = useKpi(engine, KPI_UNITS);

  const sharePayload = { tab: 'collaborate', ts: Date.now() };

  return (
    <section className="demo-section" aria-labelledby="collab-heading">
      <div className="demo-section-header">
        <h2 id="collab-heading">Collaborative Dashboards</h2>
        <p>
          Share a live link to any dashboard state. Team members can leave comments that
          persist across sessions. Click <strong>Share</strong> to copy the URL, or
          <strong> Comments</strong> to open the thread.
        </p>
      </div>

      <CollaborativeDashboard dashboardId="kpi-dashboard" sharePayload={sharePayload}>
        <article aria-label="Shared KPI cards">
          <div className="kpi-demo-grid">
            {[
              { config: KPI_REVENUE,          result: revenueResult,      prev: KPI_REVENUE_PREV  },
              { config: KPI_PROFIT,           result: profitResult,       prev: KPI_PROFIT_PREV   },
              { config: KPI_AVG_SATISFACTION, result: satisfactionResult, prev: KPI_SAT_PREV      },
              { config: KPI_UNITS,            result: unitsResult,        prev: KPI_UNITS_PREV    },
            ].map(({ config, result, prev }) => (
              <KpiCard
                key={config.id}
                config={config}
                result={result}
                size="medium"
                variant="default"
                previousPeriodValue={prev}
              />
            ))}
          </div>
        </article>
      </CollaborativeDashboard>
    </section>
  );
}
