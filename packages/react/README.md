# @gridstorm/analytix-react

React components for [Analytics Studio](https://analytics.tekivex.com) — drag-and-drop BI builder with 26+ charts, pivot tables, KPI dashboards, SQL query editor, and report designer.

## Install

```bash
npm install @gridstorm/analytix-react @gridstorm/analytix-core
```

## Peer Dependencies

```bash
npm install react react-dom recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Quick Start

```tsx
import {
  AnalyticsBuilder,
  PivotWidget,
  ChartWidget,
  KpiCard,
  SqlEditor,
} from '@gridstorm/analytix-react';

function App() {
  return (
    <AnalyticsBuilder
      datasets={[{ id: 'sales', rows: salesData, columns: [...] }]}
    >
      <KpiCard metric="total-revenue" format="currency" />
      <PivotWidget rows={['region']} columns={['quarter']} values={['revenue']} />
      <ChartWidget type="bar" xField="region" yField="revenue" />
      <SqlEditor defaultQuery="SELECT region, SUM(revenue) FROM sales GROUP BY region" />
    </AnalyticsBuilder>
  );
}
```

## Components

| Component | Description |
|---|---|
| `AnalyticsBuilder` | Root drag-and-drop builder canvas |
| `PivotWidget` | Interactive pivot table |
| `ChartWidget` | 26+ chart types |
| `KpiCard` | KPI metric with threshold status |
| `SqlEditor` | In-browser SQL query editor |
| `ReportDesigner` | PDF/Excel report composer |
| `DataConnectorPanel` | CSV/API/WebSocket data import |

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
