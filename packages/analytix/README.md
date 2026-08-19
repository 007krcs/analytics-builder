# @gridstorm/analytix

The complete **Analytics Builder** platform in one install — pivot engine, 26 chart types, KPI dashboards, AI insights, cross-filtering, data connectors (CSV/Excel/REST/WebSocket/SSE), in-browser SQL, report builder (PDF/Excel), freeform canvas, natural-language "ask your data", a streaming anomaly monitor, and the React UI.

```bash
npm install @gridstorm/analytix
```

## One import, everything

```ts
import { core, ask, monitor } from '@gridstorm/analytix';

const ds = core.buildDataset('sales', 'Sales', rows);
const plan = ask.ask('total revenue by region', ds);
const result = ask.executePlan(plan, ds);

const sentinel = new monitor.Sentinel({ numericColumns: ['requests_per_sec'] });
```

## Or flat subpath imports (tree-shake friendly)

```ts
import { ask, executePlan, summarize } from '@gridstorm/analytix/ask';
import { AnalyticsBuilder, useAnalyticsEngine } from '@gridstorm/analytix/react';
import { computePivot } from '@gridstorm/analytix/pivot';
import { parseCsvString } from '@gridstorm/analytix/connectors';
```

| Subpath | Contents |
| --- | --- |
| `/core` | Engine, dataset builder, event bus, types |
| `/pivot` | Pivot computation |
| `/charts` | Chart config + transformers |
| `/kpi` | KPI computation + scheduling |
| `/insights` | Offline AI insights (trend/anomaly/correlation/forecast) |
| `/crossfilter` | Cross-widget filtering |
| `/connectors` | CSV, Excel, REST, WebSocket, SSE |
| `/sql` | In-browser SQL over datasets |
| `/reports` | Report builder + PDF/Excel export |
| `/canvas` | Freeform dashboard canvas |
| `/react` | React components + hooks (needs `react` ≥18) |
| `/ask` | Natural-language analytics (offline + BYO-LLM) |
| `/monitor` | Sentinel streaming anomaly monitor |

Every area is also published standalone as `@gridstorm/analytix-*` if you prefer piecemeal installs. Vue and Svelte adapters ship separately (`@gridstorm/analytix-vue`, `@gridstorm/analytix-svelte`) so this package doesn't pull those runtimes in.

`react` / `react-dom` are **optional** peers — only needed if you import `/react`.

MIT © GridStorm — [github.com/007krcs/analytics-builder](https://github.com/007krcs/analytics-builder)
