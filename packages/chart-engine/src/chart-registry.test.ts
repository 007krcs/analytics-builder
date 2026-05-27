import { describe, expect, it } from 'vitest';
import { CHART_REGISTRY, prepareChartData } from './chart-registry.js';
import type { Dataset, ChartConfig } from '@gridstorm/analytix-core';

const rows = [
  { x: 'A', y: 10, z: 5 },
  { x: 'B', y: 20, z: 8 },
  { x: 'C', y: 30, z: 12 },
];
const ds: Dataset = {
  id: 'd', name: 'd', rows,
  columns: [
    { id: 'x', displayName: 'x', type: 'string', dimensional: true,  aggregatable: false, nullable: false },
    { id: 'y', displayName: 'y', type: 'number', dimensional: false, aggregatable: true,  nullable: false },
    { id: 'z', displayName: 'z', type: 'number', dimensional: false, aggregatable: true,  nullable: false },
  ],
};

function baseCfg(type: keyof typeof CHART_REGISTRY): ChartConfig {
  return {
    id: 'c', type, title: 'T', sourceId: 'd', sourceType: 'dataset', xField: 'x',
    series: [{ id: 's1', columnId: 'y', label: 'Y' }],
    filters: [], legend: { show: true, position: 'bottom' }, tooltip: { show: true },
    colorPalette: 'default', responsive: true, animationDuration: 0, showDataLabels: false,
  };
}

describe('prepareChartData', () => {
  it('all 26 registered chart types produce a PreparedChartData object', () => {
    for (const t of Object.keys(CHART_REGISTRY) as Array<keyof typeof CHART_REGISTRY>) {
      const out = prepareChartData(baseCfg(t), rows, ds);
      expect(out).toBeDefined();
      expect(out.data).toBeDefined();
    }
  });

  it('accepts the legacy README shape (yFields + fieldId)', () => {
    const legacy = {
      id: 'c', type: 'bar', title: 'T', sourceId: 'd', sourceType: 'dataset', xField: 'x',
      yFields: [{ fieldId: 'y', label: 'Y', color: '#000' }],
      filters: [], legend: { show: true, position: 'bottom' }, tooltip: { show: true },
      colorPalette: 'default', responsive: true, animationDuration: 0, showDataLabels: false,
    } as unknown as ChartConfig;
    const out = prepareChartData(legacy, rows, ds);
    expect(out.data).toHaveLength(3);
    expect(out.yKeys).toEqual(['Y']);
  });

  it('accepts per-series legacy `fieldId` alias', () => {
    const cfg = baseCfg('bar');
    cfg.series = [{ id: 's', fieldId: 'y', label: 'Y' }] as unknown as ChartConfig['series'];
    const out = prepareChartData(cfg, rows, ds);
    expect(out.data).toHaveLength(3);
  });
});
