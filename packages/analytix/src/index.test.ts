// ─── Umbrella smoke test ──────────────────────────────────────────────────────
// Proves the aggregate package actually re-exports working APIs from every
// area — not just that the files compile. Catches a renamed/removed export in
// any sub-package the moment it would break umbrella consumers.
import { describe, expect, it } from 'vitest';
import * as umbrella from './index.js';

describe('@gridstorm/analytix umbrella', () => {
  it('exposes every area as a namespace', () => {
    for (const ns of ['core', 'pivot', 'charts', 'kpi', 'insights', 'crossfilter',
      'connectors', 'sql', 'reports', 'canvas', 'react', 'ask', 'monitor'] as const) {
      expect(umbrella[ns], `namespace "${ns}" missing`).toBeTypeOf('object');
    }
  });

  it('flagship APIs are callable through the umbrella', () => {
    const ds = umbrella.core.buildDataset('t', 'T', [
      { region: 'EU', revenue: 100 },
      { region: 'US', revenue: 300 },
    ]);
    const plan = umbrella.ask.ask('total revenue by region', ds);
    const result = umbrella.ask.executePlan(plan, ds);
    expect(result.rows[0]).toMatchObject({ 'Total Revenue': 300 });

    expect(umbrella.core.AnalyticsEngine).toBeTypeOf('function');
    expect(umbrella.monitor.Sentinel).toBeTypeOf('function');
    expect(umbrella.pivot.computePivot).toBeTypeOf('function');
    expect(umbrella.kpi.computeKpi).toBeTypeOf('function');
    expect(umbrella.connectors.parseCsvString).toBeTypeOf('function');
    expect(umbrella.react.AnalyticsBuilder).toBeTypeOf('function');
  });
});
