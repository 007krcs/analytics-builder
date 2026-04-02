# @gridstorm/analytix-crossfilter

Cross-widget filtering for [Analytics Studio](https://analytics.tekivex.com) — click any chart element to instantly filter all other widgets.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-crossfilter
```

## Quick Start

```ts
import { CrossfilterEngine } from '@gridstorm/analytix-crossfilter';

const crossfilter = new CrossfilterEngine();

// Register datasets
crossfilter.add('sales', salesDataset);

// Apply a filter from a chart click
crossfilter.filter('sales', { field: 'region', value: 'North America' });

// Subscribe to filter changes (all widgets re-render)
crossfilter.subscribe((filters) => {
  console.log('Active filters:', filters);
});

// Clear filters
crossfilter.clear('sales');
```

## Features

- Click-to-filter on any chart, pivot, or KPI widget
- Multi-field filter composition (AND / OR)
- Animated transitions between filtered states
- Filter breadcrumbs for user visibility

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
