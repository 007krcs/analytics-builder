import { describe, expect, it } from 'vitest';
import { PivotEngine } from './pivot-engine.js';
import type { Dataset, PivotConfig } from '@gridstorm/analytix-core';

function makeDataset(): Dataset {
  const rows = [];
  for (let r = 0; r < 4; r++)
    for (let p = 0; p < 5; p++)
      for (let q = 0; q < 4; q++)
        for (let i = 0; i < 10; i++)
          rows.push({ region: `R${r}`, product: `P${p}`, quarter: `Q${q}`, rev: 100 + r * 10 + p + q * 5 });
  return {
    id: 'd', name: 'd', rows,
    columns: [
      { id: 'region',  displayName: 'Region',  type: 'string', dimensional: true,  aggregatable: false, nullable: false },
      { id: 'product', displayName: 'Product', type: 'string', dimensional: true,  aggregatable: false, nullable: false },
      { id: 'quarter', displayName: 'Quarter', type: 'string', dimensional: true,  aggregatable: false, nullable: false },
      { id: 'rev',     displayName: 'Rev',     type: 'number', dimensional: false, aggregatable: true,  nullable: false },
    ],
  } as Dataset;
}

describe('PivotEngine', () => {
  const pe = new PivotEngine();
  const ds = makeDataset();
  const baseCfg: PivotConfig = {
    id: 'p', datasetId: 'd',
    rowFields: ['region', 'product'],
    columnFields: ['quarter'],
    valueFields: [{ columnId: 'rev', aggregation: 'sum', label: 'R' }],
    filters: [], showRowTotals: false, showColumnTotals: false, showSubTotals: false, compactMode: false,
  };

  it('returns 20 row groups and 4 column leaves with non-null cells', () => {
    const res = pe.compute(baseCfg, ds);
    expect(res.rows).toHaveLength(20);
    expect(res.flatColumns).toHaveLength(4);
    const c = res.rows[0].cells['Q0'];
    expect(c.value).not.toBeNull();
    expect(c.value).toBe(1000);
  });

  it('accepts legacy `fieldId` alias (README compat)', () => {
    const legacyCfg = {
      ...baseCfg,
      valueFields: [{ fieldId: 'rev', aggregation: 'sum', label: 'R' }] as unknown as PivotConfig['valueFields'],
    };
    const res = pe.compute(legacyCfg, ds);
    expect(res.rows[0].cells['Q0'].value).toBe(1000);
  });

  it('computes simple row-only aggregation in <300ms on 100k rows', () => {
    const big = [];
    for (let i = 0; i < 100_000; i++) big.push({ region: `R${i % 4}`, rev: i % 1000 });
    const bds: Dataset = {
      id: 'b', name: 'b', rows: big,
      columns: [
        { id: 'region', displayName: 'R', type: 'string', dimensional: true,  aggregatable: false, nullable: false },
        { id: 'rev',    displayName: 'V', type: 'number', dimensional: false, aggregatable: true,  nullable: false },
      ],
    };
    const cfg: PivotConfig = {
      id: 'p', datasetId: 'b',
      rowFields: ['region'], columnFields: [],
      valueFields: [{ columnId: 'rev', aggregation: 'sum' }],
      filters: [], showRowTotals: true, showColumnTotals: false, showSubTotals: false, compactMode: false,
    };
    const t = performance.now();
    const res = pe.compute(cfg, bds);
    expect(performance.now() - t).toBeLessThan(300);
    expect(res.rows).toHaveLength(4);
  });
});
