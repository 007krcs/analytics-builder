import { describe, expect, it } from 'vitest';
import { AnalyticsEngine, buildDataset } from '@gridstorm/analytix-core';
import { PivotEngine } from '@gridstorm/analytix-pivot-engine';
import { KpiEngine } from '@gridstorm/analytix-kpi-engine';
import { useAnalyticsEngine, useKpi, usePivot } from './index.js';

function wire(engine: AnalyticsEngine) {
  const piv = new PivotEngine();
  const kpi = new KpiEngine();
  engine.registerPivotEngine((c, d) => piv.compute(c, d));
  engine.registerKpiEngine((c, d) => kpi.compute(c, d));
}

describe('Vue adapter (fallback mode, no vue installed)', () => {
  it('useAnalyticsEngine returns a usable engine', () => {
    const { engine } = useAnalyticsEngine();
    expect(engine).toBeInstanceOf(AnalyticsEngine);
  });

  it('useKpi populates ref.value after onMounted fires (sync in fallback)', () => {
    const engine = new AnalyticsEngine();
    wire(engine);
    const ds = buildDataset('ds', 'DS',
      [{ rev: 10 }, { rev: 20 }, { rev: 30 }],
      [
        { id: 'rev', displayName: 'Rev', type: 'number', dimensional: false, aggregatable: true, nullable: false },
      ]);
    engine.addDataset(ds);

    const ref = useKpi(engine, {
      id: 'k', title: 'Total Rev', datasetId: 'ds',
      columnId: 'rev', aggregation: 'sum', filters: [],
    });
    expect(ref.value?.value).toBe(60);
  });

  it('usePivot populates ref.value after onMounted fires', () => {
    const engine = new AnalyticsEngine();
    wire(engine);
    const ds = buildDataset('ds', 'DS',
      [{ region: 'A', rev: 10 }, { region: 'A', rev: 20 }, { region: 'B', rev: 30 }],
      [
        { id: 'region', displayName: 'Region', type: 'string', dimensional: true,  aggregatable: false, nullable: false },
        { id: 'rev',    displayName: 'Rev',    type: 'number', dimensional: false, aggregatable: true,  nullable: false },
      ]);
    engine.addDataset(ds);

    const ref = usePivot(engine, {
      id: 'p', datasetId: 'ds',
      rowFields: ['region'], columnFields: [],
      valueFields: [{ columnId: 'rev', aggregation: 'sum' }],
      filters: [], showRowTotals: false, showColumnTotals: false, showSubTotals: false, compactMode: false,
    });
    expect(ref.value?.rows).toHaveLength(2);
  });
});
