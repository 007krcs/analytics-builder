/**
 * Compile a QueryPlan into the config shapes the existing engines already
 * understand, so an NL question can drive the real PivotTable / chart UI with
 * zero new rendering code.
 */

import type {
  ChartConfig,
  PivotConfig,
} from '@gridstorm/analytix-core';
import type { QueryPlan } from './types.js';

/** Plan → PivotConfig for `@gridstorm/analytix-pivot-engine`. */
export function planToPivotConfig(plan: QueryPlan, datasetId: string): PivotConfig {
  return {
    id: 'ask-pivot',
    datasetId,
    rowFields: plan.dimensions,
    columnFields: [],
    valueFields: plan.measures.map((m) => ({
      columnId: m.columnId === '*' ? (plan.dimensions[0] ?? m.columnId) : m.columnId,
      aggregation: m.aggregation,
      label: m.label,
    })),
    filters: plan.filters,
    showRowTotals: plan.dimensions.length > 0 && plan.intent !== 'top' && plan.intent !== 'bottom',
    showColumnTotals: false,
    showSubTotals: false,
    compactMode: false,
  };
}

/** Plan → partial ChartConfig for `@gridstorm/analytix-chart-engine`. */
export function planToChartConfig(plan: QueryPlan, sourceId: string): ChartConfig {
  const xField = plan.dimensions[0] ?? '';
  return {
    id: 'ask-chart',
    type: plan.chartType,
    title: plan.explanation,
    sourceId,
    sourceType: 'dataset',
    xField,
    series: plan.measures.map((m, i) => ({
      id: `ask-s${i}`,
      columnId: m.columnId,
      label: m.label,
    })),
    filters: plan.filters,
    legend: { show: plan.measures.length > 1, position: 'bottom' },
    tooltip: { show: true, shared: true },
    colorPalette: 'default',
    responsive: true,
    animationDuration: 300,
    showDataLabels: false,
  };
}
