# @gridstorm/analytix-vue

Vue 3 composables for [Analytics Studio](https://analytics.tekivex.com) — reactive analytics state with Composition API.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-vue
```

## Quick Start

```vue
<script setup>
import { useAnalytics, usePivot, useChart } from '@gridstorm/analytix-vue';

const { engine } = useAnalytics({ datasets: [...] });
const pivot = usePivot(engine, { rows: ['region'], values: ['revenue'] });
const chart = useChart(engine, { type: 'bar', xField: 'region', yField: 'revenue' });
</script>

<template>
  <div>
    <PivotTable :data="pivot.result" />
    <BarChart :data="chart.series" />
  </div>
</template>
```

## Composables

| Composable | Description |
|---|---|
| `useAnalytics` | Initialize the analytics engine |
| `usePivot` | Reactive pivot computation |
| `useChart` | Reactive chart data |
| `useKpi` | Reactive KPI metrics |
| `useSql` | Reactive SQL query results |

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
