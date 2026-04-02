# @gridstorm/analytix-kpi-engine

KPI metrics computation with threshold comparison and auto-refresh for [Analytics Studio](https://analytics.tekivex.com).

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-kpi-engine
```

## Quick Start

```ts
import { KpiEngine } from '@gridstorm/analytix-kpi-engine';

const kpi = new KpiEngine();

kpi.define({
  id: 'total-revenue',
  label: 'Total Revenue',
  field: 'revenue',
  aggregation: 'sum',
  thresholds: [
    { value: 1_000_000, status: 'good', label: 'On target' },
    { value: 500_000, status: 'warning', label: 'Below target' },
    { value: 0, status: 'critical', label: 'At risk' },
  ],
  format: 'currency',
  refreshInterval: 5000,
});

const result = kpi.compute('total-revenue', dataset);
// { value: 1234567, status: 'good', delta: +12.3% }
```

## Features

- Auto-threshold classification (good / warning / critical)
- Delta calculation vs previous period
- Sparkline trend data
- Auto-refresh scheduling

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
