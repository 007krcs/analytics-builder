# @gridstorm/analytix-pivot-engine

Pivot table computation engine for [Analytics Studio](https://analytics.tekivex.com) — group, aggregate, and filter data visually with drag-and-drop.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-pivot-engine
```

## Quick Start

```ts
import { PivotEngine } from '@gridstorm/analytix-pivot-engine';

const pivot = new PivotEngine({
  rows: ['region', 'category'],
  columns: ['quarter'],
  values: [{ field: 'revenue', aggregation: 'sum' }],
  filters: [{ field: 'year', value: 2024 }],
});

const result = pivot.compute(dataset);
// result.cells — 2D array of aggregated values
// result.rowHeaders — row hierarchy
// result.colHeaders — column hierarchy
```

## Aggregation Functions

`sum`, `count`, `avg`, `min`, `max`, `median`, `stddev`, `variance`, `countDistinct`

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
