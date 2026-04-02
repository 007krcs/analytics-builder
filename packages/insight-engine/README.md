# @gridstorm/analytix-insight-engine

Zero-dependency AI insights engine for [Analytics Studio](https://analytics.tekivex.com) — auto-generates natural language insights from data patterns. No API key required.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-insight-engine
```

## Quick Start

```ts
import { InsightEngine } from '@gridstorm/analytix-insight-engine';

const insights = new InsightEngine();

const results = insights.analyze(dataset, {
  fields: ['revenue', 'region', 'quarter'],
  maxInsights: 5,
});

// results[0] → "North America accounts for 42% of total revenue, the highest of any region."
// results[1] → "Q4 revenue grew 18% quarter-over-quarter, the fastest growth this year."
```

## Insight Types

- **Top N** — "Region X is the top performer with Y% share"
- **Trend detection** — "Revenue grew Z% this quarter"
- **Anomaly** — "February had unusually low sales (2.1 standard deviations below average)"
- **Correlation** — "Marketing spend and revenue have a 0.87 correlation"
- **Missing data** — "15% of rows have no region assigned"

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
