# @gridstorm/analytix-svelte

Svelte stores for [Analytics Studio](https://analytics.tekivex.com) — reactive analytics state with fine-grained Svelte reactivity.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-svelte
```

## Quick Start

```svelte
<script>
  import { createAnalyticsStore, createPivotStore } from '@gridstorm/analytix-svelte';

  const analytics = createAnalyticsStore({ datasets: [...] });
  const pivot = createPivotStore(analytics, {
    rows: ['region'],
    values: ['revenue'],
  });
</script>

{#each $pivot.rows as row}
  <div>{row.region}: {row.revenue}</div>
{/each}
```

## Stores

| Store | Description |
|---|---|
| `createAnalyticsStore` | Root analytics engine store |
| `createPivotStore` | Reactive pivot computation |
| `createChartStore` | Reactive chart data |
| `createKpiStore` | Reactive KPI metrics |
| `createSqlStore` | Reactive SQL query results |

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
