/**
 * App.tsx — Demo application for Analytics Builder.
 *
 * Demonstrates:
 * 1. Loading the sample sales + employee datasets
 * 2. Pre-configured pivot tables (Revenue by Region × Category)
 * 3. Pre-configured KPI cards (Total Revenue, Total Profit, Avg Satisfaction)
 * 4. Live ChartBuilder with dataset columns
 * 5. Full AnalyticsBuilder canvas
 */

import React, { useEffect, useState } from 'react';
import { AnalyticsEngine } from '@analytix/core';
import type { KpiConfig, PivotConfig } from '@analytix/core';
import { computePivot } from '@analytix/pivot-engine';
import { computeKpi } from '@analytix/kpi-engine';
import {
  AnalyticsBuilder,
  KpiCard,
  PivotTable,
  useAnalyticsEngine,
  usePivot,
  useKpi,
} from '@analytix/react';
import { SALES_DATA, EMPLOYEE_DATA, SALES_STATS } from './data/sample-data.js';

import './styles.css';

// ─── KPI configs ──────────────────────────────────────────────────────────────

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

// ─── Pre-configured pivot ─────────────────────────────────────────────────────

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

// ─── App shell ────────────────────────────────────────────────────────────────

type DemoTab = 'builder' | 'pivot' | 'kpis' | 'about';

export default function App() {
  const [activeTab, setActiveTab] = useState<DemoTab>('builder');
  const { engine, loadDataset, version: _version } = useAnalyticsEngine();

  // Load sample datasets once
  useEffect(() => {
    loadDataset('sales', 'Sales Data', SALES_DATA as unknown as import('@analytix/core').Row[]);
    loadDataset('employees', 'Employee Data', EMPLOYEE_DATA as unknown as import('@analytix/core').Row[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salesDataset = engine.getDataset('sales') ?? null;

  const tabs: { id: DemoTab; label: string }[] = [
    { id: 'builder', label: 'Analytics Builder' },
    { id: 'pivot', label: 'Pivot Preview' },
    { id: 'kpis', label: 'KPI Dashboard' },
    { id: 'about', label: 'About' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="app-logo">⚡</span>
          <div>
            <h1 className="app-title">Analytics Builder</h1>
            <p className="app-subtitle">Drag-and-drop pivot tables, 20+ charts, KPI dashboards — no SQL required</p>
          </div>
        </div>

        <div className="app-dataset-info">
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

      <nav className="app-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`app-nav-tab ${activeTab === tab.id ? 'app-nav-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'builder' && (
          <AnalyticsBuilder
            engine={engine}
            initialDataset={salesDataset ?? undefined}
            onExport={(fmt) => alert(`Export as ${fmt} — integrate @analytix/report-builder for full PDF/Excel generation`)}
          />
        )}

        {activeTab === 'pivot' && (
          <PivotPreviewDemo engine={engine} />
        )}

        {activeTab === 'kpis' && (
          <KpiDemoSection engine={engine} />
        )}

        {activeTab === 'about' && (
          <AboutSection />
        )}
      </main>
    </div>
  );
}

// ─── Pivot preview tab ───────────────────────────────────────────────────────

function PivotPreviewDemo({ engine }: { engine: AnalyticsEngine }) {
  const { result, loading, error } = usePivot(engine, PIVOT_REVENUE_BY_REGION);

  return (
    <div className="demo-section">
      <div className="demo-section-header">
        <h2>Revenue Pivot: Region × Category</h2>
        <p>Pre-computed pivot showing revenue sum and average profit margin.</p>
      </div>

      {loading && <div className="demo-loading">Computing pivot table...</div>}
      {error && <div className="demo-error">Error: {error.message}</div>}
      {result && <PivotTable result={result} />}
    </div>
  );
}

// ─── KPI Dashboard tab ────────────────────────────────────────────────────────

function KpiDemoSection({ engine }: { engine: AnalyticsEngine }) {
  const { result: revenueResult } = useKpi(engine, KPI_REVENUE);
  const { result: profitResult } = useKpi(engine, KPI_PROFIT);
  const { result: satisfactionResult } = useKpi(engine, KPI_AVG_SATISFACTION);
  const { result: unitsResult } = useKpi(engine, KPI_UNITS);

  const kpis: Array<{ config: KpiConfig; result: ReturnType<typeof useKpi>['result'] }> = [
    { config: KPI_REVENUE, result: revenueResult },
    { config: KPI_PROFIT, result: profitResult },
    { config: KPI_AVG_SATISFACTION, result: satisfactionResult },
    { config: KPI_UNITS, result: unitsResult },
  ];

  return (
    <div className="demo-section">
      <div className="demo-section-header">
        <h2>KPI Dashboard</h2>
        <p>Key metrics computed from {SALES_DATA.length.toLocaleString()} sales records with threshold-based status.</p>
      </div>

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

      <div className="demo-stats-row">
        <StatCard label="Total Records" value={SALES_DATA.length.toLocaleString()} />
        <StatCard label="Avg Profit Margin" value={`${SALES_STATS.avgProfitMargin.toFixed(1)}%`} />
        <StatCard label="Regions Covered" value="5" />
        <StatCard label="Product Categories" value="5" />
        <StatCard label="Sales Team Size" value="10" />
        <StatCard label="Channels" value="4" />
      </div>
    </div>
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

// ─── About tab ───────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <div className="demo-section about-section">
      <h2>Analytics Builder</h2>
      <p className="about-tagline">
        A drag-and-drop analytics platform — no SQL required.
      </p>

      <div className="about-grid">
        <AboutCard
          icon="⊞"
          title="Pivot Tables"
          description="Drag dimensions into rows and columns. Aggregate with sum, avg, count, median, stdDev and more. Grand totals included."
        />
        <AboutCard
          icon="📊"
          title="20+ Chart Types"
          description="Bar, line, area, scatter, bubble, heatmap, treemap, funnel, waterfall, radar, sankey, and more — all powered by Recharts."
        />
        <AboutCard
          icon="📈"
          title="KPI Dashboards"
          description="Threshold-based status (good/warning/critical), period-over-period trend arrows, auto-refresh on configurable intervals."
        />
        <AboutCard
          icon="📄"
          title="Scheduled Reports"
          description="Compose reports with a fluent builder API. Schedule via interval, cron expression, or one-time. Export to PDF or Excel."
        />
        <AboutCard
          icon="🎯"
          title="Drag & Drop"
          description="@dnd-kit/core powers field drag-and-drop throughout — from field panel to drop zones to KPI card reordering."
        />
        <AboutCard
          icon="⚡"
          title="GridStorm Powered"
          description="Built on top of the GridStorm platform for high-performance data grid rendering and plugin architecture."
        />
      </div>

      <div className="about-tech">
        <h3>Technology Stack</h3>
        <ul>
          <li><strong>pnpm monorepo</strong> — 6 workspace packages</li>
          <li><strong>TypeScript 5.x strict mode</strong> — end-to-end type safety</li>
          <li><strong>React 18</strong> — UI components and hooks</li>
          <li><strong>Recharts 2</strong> — 20+ chart type renderers</li>
          <li><strong>@dnd-kit</strong> — accessible drag-and-drop</li>
          <li><strong>tsup</strong> — ESM + CJS dual build</li>
          <li><strong>Vite 5</strong> — blazing-fast demo dev server</li>
        </ul>
      </div>
    </div>
  );
}

function AboutCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="about-card">
      <div className="about-card-icon">{icon}</div>
      <h3 className="about-card-title">{title}</h3>
      <p className="about-card-desc">{description}</p>
    </div>
  );
}
