# @gridstorm/analytix-core

Core types, engine, store, and event bus for [Analytics Studio](https://analytics.tekivex.com) — the foundation all other `@gridstorm/analytix-*` packages build on.

## Install

```bash
npm install @gridstorm/analytix-core
```

## What's Included

- **AnalyticsEngine** — orchestrates data flow between widgets
- **AnalyticsStore** — reactive state store for datasets, widgets, and layout
- **EventBus** — typed publish/subscribe for cross-widget communication
- **Core types** — `Dataset`, `Widget`, `Column`, `FilterState`, `AggregationResult`

## Quick Start

```ts
import { createAnalyticsEngine } from '@gridstorm/analytix-core';

const engine = createAnalyticsEngine();

engine.loadDataset({
  id: 'sales',
  columns: [
    { field: 'region', type: 'string' },
    { field: 'revenue', type: 'number' },
  ],
  rows: [...],
});
```

## Part of Analytics Studio

| Package | Description |
|---|---|
| `@gridstorm/analytix-pivot-engine` | Pivot table computation |
| `@gridstorm/analytix-chart-engine` | 26+ chart types |
| `@gridstorm/analytix-kpi-engine` | KPI metrics and thresholds |
| `@gridstorm/analytix-sql-connector` | In-browser SQL engine |
| `@gridstorm/analytix-react` | React components |

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
