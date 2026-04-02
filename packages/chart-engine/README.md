# @gridstorm/analytix-chart-engine

26+ interactive chart types for [Analytics Studio](https://analytics.tekivex.com) — bar, line, scatter, pie, radar, heatmap, treemap, sankey, and more.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-chart-engine
```

## Quick Start

```ts
import { ChartRegistry } from '@gridstorm/analytix-chart-engine';

const registry = new ChartRegistry();

const chartConfig = registry.create('bar', {
  dataset: 'sales',
  xField: 'region',
  yField: 'revenue',
  aggregation: 'sum',
});
```

## Supported Chart Types

| Type | Key |
|---|---|
| Bar (vertical/horizontal) | `bar`, `bar-horizontal` |
| Line / Area | `line`, `area` |
| Scatter / Bubble | `scatter`, `bubble` |
| Pie / Donut | `pie`, `donut` |
| Radar / Spider | `radar` |
| Heatmap | `heatmap` |
| Treemap | `treemap` |
| Sankey | `sankey` |
| Funnel | `funnel` |
| Waterfall | `waterfall` |
| Box Plot | `box-plot` |
| Histogram | `histogram` |

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
