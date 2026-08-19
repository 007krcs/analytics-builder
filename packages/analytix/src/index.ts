/**
 * @gridstorm/analytix — the whole Analytics Builder platform in one install.
 *
 * The root entry exposes each area as a NAMESPACE so nothing can collide:
 *
 *   import { ask, monitor, core } from '@gridstorm/analytix';
 *   const plan = ask.ask('total revenue by region', dataset);
 *   const sentinel = new monitor.Sentinel({ numericColumns: ['rps'] });
 *
 * Prefer flat imports? Every area is also a subpath (tree-shakes better):
 *
 *   import { ask, executePlan } from '@gridstorm/analytix/ask';
 *   import { AnalyticsBuilder } from '@gridstorm/analytix/react';
 *
 * The standalone @gridstorm/analytix-* packages remain published for
 * piecemeal installs; this package simply aggregates the same versions.
 * (Vue and Svelte adapters are intentionally not bundled — install
 * @gridstorm/analytix-vue / -svelte alongside if you need them.)
 */

export * as core from '@gridstorm/analytix-core';
export * as pivot from '@gridstorm/analytix-pivot-engine';
export * as charts from '@gridstorm/analytix-chart-engine';
export * as kpi from '@gridstorm/analytix-kpi-engine';
export * as insights from '@gridstorm/analytix-insight-engine';
export * as crossfilter from '@gridstorm/analytix-crossfilter';
export * as connectors from '@gridstorm/analytix-data-connector';
export * as sql from '@gridstorm/analytix-sql-connector';
export * as reports from '@gridstorm/analytix-report-builder';
export * as canvas from '@gridstorm/analytix-canvas-layout';
export * as react from '@gridstorm/analytix-react';
export * as ask from '@gridstorm/analytix-ask';
export * as monitor from '@gridstorm/analytix-monitor';
