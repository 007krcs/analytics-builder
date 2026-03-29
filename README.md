# 📊 Analytix

```
    ___                __      __  _
   /   |  ____  ____ _/ /_  __/ /_(_)  __
  / /| | / __ \/ __ `/ / / / / __/ / |/_/
 / ___ |/ / / / /_/ / / /_/ / /_/ />  <
/_/  |_/_/ /_/\__,_/_/\__, /\__/_/_/|_|
                      /____/
```

**The open-source, embeddable analytics builder. Powered by GridStorm.**

[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](./LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blueviolet?style=flat-square)](./CONTRIBUTING.md)

---

## ✨ What is Analytix?

Analytix is a **drag-and-drop analytics builder** that you embed directly in your React application — no server, no external BI tool, no SQL required. Drop a CSV or connect a WebSocket stream, drag fields onto a pivot table or chart canvas, and get interactive dashboards with AI-generated insights in seconds.

Unlike **Tableau** or **Power BI**, Analytix is fully open-source and ships as TypeScript packages you install via pnpm — your data never leaves the browser. Unlike **Apache Superset** or **Metabase**, there is no separate backend service to deploy, no database credentials to manage, and no "BI admin" role to create. It embeds in your product the same way you'd embed a date picker.

The engine layer is headless and framework-agnostic. The `@analytix/react` package provides a production-ready `<AnalyticsBuilder />` component with drag-and-drop pivot, chart, KPI, and report tabs out of the box, while every sub-engine can be used standalone in any TypeScript project.

---

## 🏆 Why Analytix?

| Feature | Analytix | Tableau | Power BI | Metabase | Superset |
|---|:---:|:---:|:---:|:---:|:---:|
| **AI Insights (no API key)** | ✅ | ❌ | ⚠️ Paid add-on | ❌ | ❌ |
| **Cross-widget filtering** | ✅ | ✅ | ✅ | ⚠️ Limited | ⚠️ Limited |
| **Freeform canvas layout** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Zero-config CSV import** | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| **WebSocket live streaming** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Open source** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Embeddable in React** | ✅ | ❌ | ⚠️ iframe only | ⚠️ iframe only | ⚠️ iframe only |
| **No SQL required** | ✅ | ❌ | ❌ | ❌ | ❌ |

> ⚠️ = partially supported or requires paid tier / additional configuration

---

## 📦 Package Overview

Analytix is a **pnpm monorepo** with 10 focused packages. Each package has zero runtime dependencies outside the monorepo itself.

| Package | Description | Size |
|---|---|---|
| [`@analytix/core`](#analytixcore) | Central `AnalyticsEngine`, shared TypeScript types, event bus | ~18 KB |
| [`@analytix/pivot-engine`](#analytixpivot-engine) | Real pivot computation with 14 aggregation functions | ~12 KB |
| [`@analytix/chart-engine`](#analytixchart-engine) | Chart registry covering 26 chart types, data transformers | ~22 KB |
| [`@analytix/kpi-engine`](#analytixkpi-engine) | KPI metrics, threshold alerts, cron-based auto-refresh | ~14 KB |
| [`@analytix/report-builder`](#analytixreport-builder) | Fluent builder API, PDF + Excel export | ~16 KB |
| [`@analytix/react`](#analytixreact) | `<AnalyticsBuilder />`, `<PivotTable />`, `<KpiCard />`, hooks | ~28 KB |
| [`@analytix/insight-engine`](#analytixinsight-engine) | Zero-dependency AI insights — trends, anomalies, correlations, forecasts | ~20 KB |
| [`@analytix/crossfilter`](#analytixcrossfilter) | Cross-widget filtering with `useCrossFilter` React hook | ~10 KB |
| [`@analytix/data-connector`](#analytixdata-connector) | CSV, REST, WebSocket, clipboard ingestion | ~16 KB |
| [`@analytix/canvas-layout`](#analytixcanvas-layout) | Freeform canvas with snap guides, undo/redo, minimap | ~18 KB |

---

## 🚀 Quick Start

### Install

```bash
pnpm add @analytix/core @analytix/react @analytix/data-connector
```

### Minimal working example

```tsx
import { AnalyticsEngine }   from '@analytix/core';
import { parseCsv }           from '@analytix/data-connector';
import { AnalyticsBuilder }   from '@analytix/react';

// 1. Create engine (one per page / session)
const engine = new AnalyticsEngine();

// 2. Load a CSV file — type inference happens automatically
const dataset = await parseCsv(csvText, { id: 'sales', name: 'Sales Data' });
engine.addDataset(dataset);

// 3. Drop the builder into your React tree
export default function App() {
  return (
    <AnalyticsBuilder
      engine={engine}
      initialDataset={dataset}
      onExport={(fmt) => console.log('Export as', fmt)}
    />
  );
}
```

That's it. The builder renders a full-featured analytics UI with drag-and-drop pivot tables, 26 chart types, KPI cards, and report scheduling — no additional configuration required.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        @analytix/react                          │
│  AnalyticsBuilder · PivotBuilder · ChartBuilder · KpiDashboard  │
│  FieldPanel · DropZone · KpiCard · ReportScheduler              │
│  hooks: useAnalyticsEngine · usePivot · useKpi                  │
└────────┬───────────────────────────────────────────┬────────────┘
         │                                           │
         ▼                                           ▼
┌─────────────────┐                     ┌────────────────────────┐
│  @analytix/core │◄────────────────────│  @analytix/crossfilter │
│  AnalyticsEngine│                     │  CrossFilterEngine     │
│  EventBus       │                     │  useCrossFilter hook   │
│  Types & DTOs   │                     └────────────────────────┘
└────────┬────────┘
         │  delegates to specialized engines
    ┌────┴──────────────────────────────────────┐
    │                                           │
    ▼                                           ▼
┌─────────────────────┐             ┌───────────────────────────┐
│ @analytix/pivot-eng │             │   @analytix/chart-engine  │
│  PivotEngine        │             │   ChartRegistry (26 types)│
│  14 aggregations    │             │   Data transformers       │
└─────────────────────┘             └───────────────────────────┘
    │
    ▼
┌─────────────────────┐             ┌───────────────────────────┐
│  @analytix/kpi-eng  │             │  @analytix/insight-engine │
│  KpiEngine          │             │  Trend · Anomaly ·        │
│  RefreshScheduler   │             │  Correlation · Segment ·  │
└─────────────────────┘             │  Forecast detectors       │
                                    └───────────────────────────┘

┌─────────────────────┐             ┌───────────────────────────┐
│ @analytix/report-   │             │  @analytix/data-connector │
│ builder             │             │  CSV · REST · WebSocket ·  │
│ ReportBuilder (API) │             │  Clipboard connectors     │
│ PDF + Excel export  │             └───────────────────────────┘
└─────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    @analytix/canvas-layout                      │
│    CanvasEngine · SnapEngine · WidgetRegistry · undo/redo       │
└─────────────────────────────────────────────────────────────────┘
```

Data always flows in one direction: **Connectors → Engine → Specialized engines → React components**. The `AnalyticsEngine` is the single source of truth; it holds dataset, pivot, chart, KPI, and report registries and dispatches events through its `EventBus`.

---

## 📚 Package Deep-Dives

---

### `@analytix/core`

The central orchestrator. `AnalyticsEngine` wires all specialized engines together in a single session and exposes a clean dataset-first API. It also owns the shared TypeScript type vocabulary consumed by every other package.

<details>
<summary>Key APIs</summary>

```typescript
class AnalyticsEngine {
  // Dataset registry
  addDataset(dataset: Dataset): void
  getDataset(id: string): Dataset | undefined
  getAllDatasets(): Dataset[]
  removeDataset(id: string): void

  // Pivot / Chart / KPI / Report config registries
  addPivotConfig(config: PivotConfig): void
  addChartConfig(config: ChartConfig): void
  addKpiConfig(config: KpiConfig): void
  addReportConfig(config: ReportConfig): void
  updateReportConfig(id: string, patch: Partial<ReportConfig>): void

  // Computation (adapters injected at runtime)
  computePivot(configId: string): PivotResult
  computeKpi(configId: string): KpiResult

  // Event bus
  readonly eventBus: EventBus

  // Lifecycle
  destroy(): void
}
```

</details>

<details>
<summary>Code example — create engine and wire adapters</summary>

```typescript
import { AnalyticsEngine, buildDataset } from '@analytix/core';
import { PivotEngine }   from '@analytix/pivot-engine';
import { KpiEngine }     from '@analytix/kpi-engine';

const engine = new AnalyticsEngine({ debug: true, maxDatasets: 10 });

// Register computation adapters
const pivotEngine = new PivotEngine();
const kpiEngine   = new KpiEngine();

engine.registerPivotAdapter((config, dataset) =>
  pivotEngine.compute(config, dataset)
);
engine.registerKpiAdapter((config, dataset) =>
  kpiEngine.compute(config, dataset)
);

// Listen to events
engine.eventBus.on('dataset:added', ({ datasetId }) => {
  console.log('Dataset loaded:', datasetId);
});

// Add your data
const dataset = buildDataset('sales-q1', 'Q1 Sales', rows, columns);
engine.addDataset(dataset);
```

</details>

---

### `@analytix/pivot-engine`

Computes real pivot tables in-memory with multi-level row and column grouping, grand totals, and subtotals. All computation is synchronous and runs on the main thread without workers — fast enough for datasets up to ~500k rows.

<details>
<summary>Supported aggregation functions (14)</summary>

| Function | Description |
|---|---|
| `sum` | Total of all values |
| `avg` | Arithmetic mean |
| `count` | Row count (including nulls) |
| `countDistinct` | Unique value count |
| `min` | Minimum value |
| `max` | Maximum value |
| `median` | 50th percentile |
| `stdDev` | Sample standard deviation |
| `variance` | Sample variance |
| `percentile` | Nth percentile (configurable, default P90) |
| `first` | First value in group |
| `last` | Last value in group |

</details>

<details>
<summary>Code example — compute a pivot table</summary>

```typescript
import { PivotEngine } from '@analytix/pivot-engine';

const engine = new PivotEngine();

const result = engine.compute(
  {
    rowFields:    ['region', 'product'],
    columnFields: ['quarter'],
    valueFields:  [
      { fieldId: 'revenue',  aggregation: 'sum',    label: 'Revenue'   },
      { fieldId: 'quantity', aggregation: 'count',  label: 'Units Sold' },
      { fieldId: 'margin',   aggregation: 'avg',    label: 'Avg Margin' },
    ],
    grandTotalRow:    true,
    grandTotalColumn: true,
    filters: [
      { fieldId: 'year', operator: 'equals', value: 2024 },
    ],
  },
  dataset
);

// result.rows       — PivotRow[] with nested cells
// result.columns    — PivotColumnHeader[] tree
// result.grandTotal — grand total row
// result.durationMs — computation time
```

</details>

---

### `@analytix/chart-engine`

Registry of 26 chart types with metadata, default config schemas, and data transformation functions that normalize any `Row[]` into the format expected by Recharts components.

<details>
<summary>All 26 chart types</summary>

**Comparison**
`bar` · `bar-horizontal` · `bar-stacked` · `bar-stacked-100`

**Trend / Time-series**
`line` · `line-smooth` · `area` · `area-stacked`

**Circular / Hierarchical**
`pie` · `donut` · `sunburst`

**Scatter & Statistical**
`scatter` · `bubble` · `histogram` · `box-plot` · `violin`

**Heatmap & Matrix**
`heatmap` · `treemap` · `calendar-heatmap`

**Specialized**
`waterfall` · `funnel` · `gauge` · `radar` · `polar` · `sankey` · `combo`

</details>

<details>
<summary>Code example — prepare chart data</summary>

```typescript
import { ChartRegistry, prepareChartData } from '@analytix/chart-engine';

// Inspect metadata for any chart type
const meta = ChartRegistry.get('bar');
// { label: 'Bar Chart', category: 'comparison', supportsGrouping: true, ... }

// Transform raw rows into Recharts-ready data
const prepared = prepareChartData(
  {
    type:      'bar',
    xField:    'product',
    yFields:   [{ fieldId: 'revenue', label: 'Revenue', color: '#6366f1' }],
    title:     'Revenue by Product',
    animation: true,
    legend:    { show: true, position: 'bottom' },
  },
  dataset.rows
);

// prepared.data      — [{ product: 'Widget A', revenue: 12500 }, ...]
// prepared.xKey      — 'product'
// prepared.yKeys     — ['revenue']
// prepared.colorMap  — { revenue: '#6366f1' }
```

</details>

---

### `@analytix/kpi-engine`

Computes scalar KPI values from a dataset using any of the supported aggregation functions. Supports threshold-based status alerts (`on-track` / `at-risk` / `off-track`), period-over-period trend calculation, and value formatting.

`RefreshScheduler` drives automatic KPI refresh on a cron or interval basis, with pause-when-hidden behavior and error backoff.

<details>
<summary>Code example — KPI with cron-based refresh</summary>

```typescript
import { KpiEngine }        from '@analytix/kpi-engine';
import { RefreshScheduler } from '@analytix/kpi-engine';

const kpiEngine   = new KpiEngine();
const scheduler   = new RefreshScheduler();

// 1. Define the KPI
const config = {
  id:          'kpi-mrr',
  title:       'Monthly Recurring Revenue',
  fieldId:     'mrr',
  aggregation: 'sum' as const,
  format:      { type: 'currency', currency: 'USD', decimals: 0 },
  thresholds: {
    target:  100_000,
    warning: 80_000,
    danger:  60_000,
  },
  refreshPolicy: {
    enabled:         true,
    intervalSeconds: 60,           // fallback interval
    cron:            '0 * * * *',  // refresh on the hour
    pauseWhenHidden: true,
    maxRefreshes:    1440,         // auto-stop after 24 h
  },
};

// 2. Compute once now
const result = kpiEngine.compute(config, dataset);
// result.value      — 94500
// result.status     — 'at-risk'
// result.trend      — { direction: 'up', changePercent: 6.2 }
// result.formatted  — '$94,500'

// 3. Schedule auto-refresh
scheduler.onRefresh(async (kpiId) => {
  const fresh = kpiEngine.compute(config, await fetchLatestDataset());
  updateUi(kpiId, fresh);
});
scheduler.schedule('kpi-mrr', config.refreshPolicy);
```

</details>

---

### `@analytix/report-builder`

A fluent builder API for composing multi-section reports that can be exported to PDF or Excel. Reports can be scheduled on a cron-like delivery cadence and emailed as attachments.

<details>
<summary>Code example — fluent builder chain</summary>

```typescript
import { ReportBuilder } from '@analytix/report-builder';

const report = new ReportBuilder('q1-report', 'Q1 2024 Sales Performance')
  .description('Executive summary for Q1 2024 covering all product lines.')
  .pageLayout({ size: 'A4', orientation: 'landscape' })

  // ── Cover ──────────────────────────────────────────────
  .title('Q1 2024 Sales Performance', 1)
  .text('Revenue grew 14% QoQ, driven by Enterprise and APAC expansion.')

  // ── KPI summary banner ─────────────────────────────────
  .addKpiSummary(['kpi-revenue', 'kpi-units', 'kpi-margin', 'kpi-nrr'])

  // ── Charts ─────────────────────────────────────────────
  .addChart('chart-revenue-by-region')
  .addChart('chart-pipeline-funnel')
  .pageBreak()

  // ── Pivot tables ────────────────────────────────────────
  .addPivotTable('pivot-product-quarter')
  .pageBreak()

  // ── Raw data appendix ───────────────────────────────────
  .title('Appendix — Full Transaction Log', 2)
  .addDataTable('sales-transactions')

  // ── Schedule weekly PDF delivery ────────────────────────
  .schedule(
    { cron: '0 8 * * 1', timezone: 'America/New_York' },
    ['pdf', 'excel'],
    { emails: ['cfo@company.com', 'vp-sales@company.com'] }
  )
  .build();
```

</details>

---

### `@analytix/react`

The highest-level package: pre-built React components and hooks that wire every engine together into a drag-and-drop UI. Uses `@dnd-kit/core` for drag interactions.

**Components exported:**
`AnalyticsBuilder` · `PivotBuilder` · `PivotTable` · `ChartBuilder` · `KpiCard` · `KpiDashboard` · `FieldPanel` · `DropZone` · `ReportScheduler`

**Hooks exported:**
`useAnalyticsEngine` · `usePivot` · `useKpi` · `useKpiMany`

<details>
<summary>Code example — full-featured builder</summary>

```tsx
import { useMemo }             from 'react';
import { AnalyticsEngine }     from '@analytix/core';
import { PivotEngine }         from '@analytix/pivot-engine';
import { KpiEngine }           from '@analytix/kpi-engine';
import { AnalyticsBuilder }    from '@analytix/react';
import { parseCsv }            from '@analytix/data-connector';

export function DashboardPage({ csvText }: { csvText: string }) {
  const engine = useMemo(() => {
    const e = new AnalyticsEngine({ debug: false });
    // Wire computation adapters
    const piv = new PivotEngine();
    const kpi = new KpiEngine();
    e.registerPivotAdapter((c, d) => piv.compute(c, d));
    e.registerKpiAdapter((c, d)   => kpi.compute(c, d));
    return e;
  }, []);

  const [dataset, setDataset] = useState<Dataset | null>(null);

  useEffect(() => {
    parseCsv(csvText, { id: 'ds-1', name: 'My Data' })
      .then((ds) => { engine.addDataset(ds); setDataset(ds); });
  }, [csvText, engine]);

  if (!dataset) return <p>Loading…</p>;

  return (
    <AnalyticsBuilder
      engine={engine}
      initialDataset={dataset}
      onExport={(fmt) => console.log('Exporting as', fmt)}
      className="h-screen"
    />
  );
}
```

</details>

<details>
<summary>Code example — standalone KpiCard</summary>

```tsx
import { KpiCard, useKpi } from '@analytix/react';

function RevenueCard({ engine, datasetId }: { engine: AnalyticsEngine; datasetId: string }) {
  const config = {
    id:          'kpi-revenue',
    title:       'Total Revenue',
    fieldId:     'revenue',
    aggregation: 'sum' as const,
    format:      { type: 'currency' as const, currency: 'USD', decimals: 0 },
    thresholds:  { target: 500_000 },
  };

  const { result, isLoading } = useKpi(engine, config, datasetId);

  return (
    <KpiCard
      config={config}
      result={result}
      loading={isLoading}
      size="lg"
      showTrend
      showSparkline
    />
  );
}
```

</details>

---

### `@analytix/insight-engine`

Automatically extracts plain-English insights from any `Dataset` — no API key, no LLM call, no network request. Five parallel detectors analyze patterns and a narrative generator summarizes the top findings.

<details>
<summary>Detectors</summary>

| Detector | What it finds |
|---|---|
| **Trend** | Monotonic up/down trends, flat plateaus, acceleration/deceleration |
| **Anomaly** | Spikes and dips using Z-score + IQR combined scoring |
| **Correlation** | Strong and inverse Pearson correlations between numeric columns |
| **Segment** | Dominant / bottom segments in categorical breakdowns |
| **Forecast** | Linear regression extrapolation, growth/decline projections |

</details>

<details>
<summary>Code example — analyze a dataset</summary>

```typescript
import { InsightEngine } from '@analytix/insight-engine';

const engine = new InsightEngine();

const result = await engine.analyze(dataset, {
  detectors:    ['trend', 'anomaly', 'correlation', 'forecast'],
  maxInsights:  10,
  minConfidence: 0.5,
  columnFilter: ['revenue', 'cac', 'churn_rate', 'nrr'],
});

// Example result.insights[0]:
// {
//   id:              'ins-trend-001',
//   type:            'trend-up',
//   title:           'Revenue growing strongly',
//   description:     'Monthly revenue has increased 23% over the past 6 periods with high consistency.',
//   severity:        'info',
//   affectedColumns: ['revenue'],
//   confidence:      0.91,
//   chartSuggestion: 'line',
// }

console.log(result.narrative);
// "Revenue is growing strongly (+23% over 6 periods). CAC shows an anomalous
//  spike in March (2.4σ above mean). Revenue and NRR are strongly correlated
//  (r = 0.87). Churn rate is forecasted to decline 8% over the next 3 periods."
```

</details>

---

### `@analytix/crossfilter`

Enables **cross-widget filtering** — clicking a bar in one chart instantly filters every other chart on the dashboard that shares the same dataset. Each widget sees every other widget's filter except its own, so the source widget always shows full data.

<details>
<summary>Architecture</summary>

```
State:  Map<datasetId, Map<column, Map<sourceWidgetId, Set<value>>>>

Widget A sets filter → CrossFilterEngine emits 'filter-set' event
→ Widget B re-renders with getFilteredRows(datasetId, rows, widgetB)
   (Widget B's own filters are excluded from its view)
```

</details>

<details>
<summary>Code example — useCrossFilter hook</summary>

```tsx
import { CrossFilterProvider, useCrossFilter } from '@analytix/crossfilter';

// 1. Wrap your dashboard
function Dashboard({ dataset }) {
  return (
    <CrossFilterProvider>
      <RevenueChart  datasetId={dataset.id} rows={dataset.rows} />
      <RegionPieChart datasetId={dataset.id} rows={dataset.rows} />
      <SalesTable    datasetId={dataset.id} rows={dataset.rows} />
    </CrossFilterProvider>
  );
}

// 2. Use the hook in each widget
function RevenueChart({ datasetId, rows }) {
  const { filteredRows, setFilter, clearFilter, isFiltered, filterCount } =
    useCrossFilter('widget-revenue-bar', datasetId, rows);

  // filteredRows = rows with all OTHER widgets' filters applied
  // isFiltered   = true when another widget has an active filter
  // filterCount  = number of active filter dimensions

  return (
    <BarChart
      data={filteredRows}
      onBarClick={(bar) => setFilter('region', [bar.region])}
      onBackgroundClick={clearFilter}
      style={{ opacity: isFiltered ? 1 : 0.85 }}
    />
  );
}
```

</details>

---

### `@analytix/data-connector`

Four zero-configuration connectors that parse raw data into `Dataset` objects with auto-inferred column types. The schema inferrer samples up to 1000 rows and classifies each column as `string`, `number`, `boolean`, `date`, or `datetime`.

<details>
<summary>CSV connector</summary>

```typescript
import { parseCsv } from '@analytix/data-connector';

// From a File object (drag-and-drop or <input type="file">)
const file    = event.target.files[0];
const csvText = await file.text();

const dataset = await parseCsv(csvText, {
  id:   'orders-2024',
  name: 'Orders 2024',
  // Optional overrides
  delimiter: ',',    // auto-detected if omitted
  hasHeader: true,   // auto-detected if omitted
});

// dataset.columns — [{ id: 'order_id', name: 'order_id', type: 'number' }, ...]
// dataset.rows    — [{ order_id: 1001, product: 'Widget A', revenue: 299.99 }, ...]
```

</details>

<details>
<summary>REST connector</summary>

```typescript
import { createRestConnector } from '@analytix/data-connector';

const connector = createRestConnector({
  url:          'https://api.example.com/sales',
  method:       'GET',
  headers:      { Authorization: `Bearer ${token}` },
  dataPath:     'data.records',   // JSONPath into response
  pollInterval: 30_000,           // optional polling in ms
  onData: (dataset) => engine.addDataset(dataset),
  onError: (err)    => console.error(err),
});

await connector.fetch();          // one-shot fetch
connector.startPolling();         // start interval polling
connector.stopPolling();          // stop polling
```

</details>

<details>
<summary>WebSocket streaming connector</summary>

```typescript
import { createWebSocketConnector } from '@analytix/data-connector';

const connector = createWebSocketConnector('wss://live.example.com/feed', {
  batchSize:      50,        // rows to accumulate before firing onBatch
  flushIntervalMs: 500,      // max ms to wait before flushing partial batch
  messageToRow: (raw) => {
    const msg = JSON.parse(raw);
    return msg.type === 'tick' ? msg.payload : null;
  },
  onBatch: (rows) => {
    // Merge into existing dataset
    engine.appendRows('live-feed', rows);
  },
  onOpen:  () => console.log('Stream connected'),
  onClose: () => console.log('Stream closed'),
});

// connector.disconnect()
// connector.isConnected
// connector.rowCount
```

</details>

---

### `@analytix/canvas-layout`

A freeform canvas engine for positioning and resizing dashboard widgets via drag-and-drop. Includes snap-to-grid, edge and center snap guides, full undo/redo (20-step history), zoom, scroll, and JSON serialization for save/restore.

<details>
<summary>Code example — DashboardCanvas</summary>

```typescript
import { CanvasEngine } from '@analytix/canvas-layout';

const canvas = new CanvasEngine();

// Add widgets to the canvas
const barId = canvas.addWidget(
  'chart',
  { x: 40, y: 40 },
  { width: 480, height: 300 },
  'Revenue by Region'
);

const kpiId = canvas.addWidget(
  'kpi',
  { x: 560, y: 40 },
  { width: 220, height: 120 },
  'Total Revenue'
);

// Subscribe to layout changes (for React re-renders)
canvas.subscribe((layout) => {
  setWidgets(layout.widgets);
});

// Programmatic operations
canvas.moveWidget(barId, 20, 0);             // nudge right 20px
canvas.resizeWidget(barId, 'se', 50, 30);   // resize from SE corner
canvas.bringToFront(barId);
canvas.lockWidget(kpiId);                   // prevent accidental moves

// Undo / redo
canvas.undo();
canvas.redo();

// Zoom and viewport
canvas.setZoom(0.75);
canvas.setViewport({ x: 100, y: 0 });

// Save / restore
const json    = canvas.serialize();         // CanvasLayout JSON
canvas.restore(json);                       // restore from JSON
```

</details>

---

## 🖥️ Demo

> Screenshot placeholder — run `pnpm dev` to see the live builder

```
┌──────────────────────────────────────────────────────────────────────┐
│  Analytix  │  📂 Upload CSV   │  🔗 Connect API   │  ⚙ Settings     │
├─────────────┬────────────────────────────────────────────────────────┤
│ Fields      │  [ Pivot │ Charts │ KPIs │ Report ]                    │
│─────────────│                                                         │
│ 🔵 region   │  ┌ Rows ──────────────┐  ┌ Values ─────────────────┐  │
│ 🔵 product  │  │ region             │  │ ∑ revenue               │  │
│ 🟡 revenue  │  │ product            │  │ # count                 │  │
│ 🟡 quantity │  └────────────────────┘  └─────────────────────────┘  │
│ 🟡 margin   │                                                         │
│ 🔴 date     │       Q1      Q2      Q3      Q4    Total              │
│             │ APAC  $124k  $138k  $151k  $167k   $580k              │
│             │ EMEA  $98k   $102k  $115k  $128k   $443k              │
│             │ AMER  $201k  $219k  $244k  $271k   $935k              │
│             │ Total $423k  $459k  $510k  $566k  $1.96M              │
└─────────────┴────────────────────────────────────────────────────────┘
```

### Run locally

```bash
# Clone and install
git clone https://github.com/your-org/analytix.git
cd analytix
pnpm install

# Build all packages
pnpm build

# Start the demo app (hot-reload)
pnpm dev
```

The demo starts at `http://localhost:5173` and includes a sample sales dataset with 10,000 rows, a live WebSocket feed simulator, and pre-built dashboard examples.

---

## 📖 Documentation

Full documentation lives in the [`docs/`](./docs/) folder and is browsable locally by opening `docs/index.html`.

| Section | Path |
|---|---|
| Getting Started | [`docs/getting-started.html`](./docs/getting-started.html) |
| API Reference | [`docs/api-reference.html`](./docs/api-reference.html) |
| Examples & Recipes | [`docs/examples.html`](./docs/examples.html) |

---

## 🗺️ Roadmap

### Q3 2026 — General Availability (v1.0)

- [ ] Collaborative editing (CRDT-based, powered by Yjs)
- [ ] SQL connector (DuckDB WASM — query CSV / Parquet files with SQL)
- [ ] Mobile-responsive layout engine with touch drag-and-drop
- [ ] Plugin marketplace — community chart types, connectors, and themes
- [ ] Storybook component library with visual regression tests
- [ ] Accessibility audit and WCAG 2.1 AA compliance
- [ ] `@analytix/vue` and `@analytix/svelte` adapter packages
- [ ] Server-side rendering support for pivot and KPI engines
- [ ] Native time-series axis with zoom / pan gestures
- [ ] Snapshot alerts — compare KPI snapshots across periods and alert on deviation

### Beyond v1.0

- Natural language query interface (powered by `@analytix/insight-engine` — no external API)
- PDF report designer with drag-and-drop sections
- Embedded annotation layer — sticky notes on charts
- Delta Lake / Parquet file connector

---

## 🤝 Contributing

Contributions are welcome! Please read this section before opening a PR.

### Development setup

```bash
# 1. Fork and clone
git clone https://github.com/your-org/analytix.git
cd analytix

# 2. Install dependencies (requires pnpm >= 9)
pnpm install

# 3. Build all packages
pnpm build

# 4. Run the full test suite
pnpm test

# 5. Watch mode during development
pnpm test:watch

# 6. Type-check without emitting
pnpm lint
```

### Project conventions

- **TypeScript strict mode** with `noUnusedLocals` and `noUnusedParameters` — prefix intentionally unused parameters with `_`.
- **ESM-first** — all packages use `"type": "module"` and explicit `.js` extensions in imports.
- **No external runtime dependencies** in engine packages — only `@analytix/core` may be imported as a peer.
- **Test coverage** — new features require Vitest unit tests in the same package.
- **Commit style** — conventional commits (`feat:`, `fix:`, `chore:`).

### Submitting a PR

1. Create a feature branch from `main`
2. Make your changes and add tests
3. Run `pnpm build && pnpm test && pnpm lint` — all must pass
4. Open a pull request with a clear description and screenshots for UI changes

---

## 📄 License

MIT © 2024 Analytix Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

---

<p align="center">
  Built on <a href="https://github.com/your-org/grid-data">GridStorm</a> — the next-generation data grid platform
</p>
