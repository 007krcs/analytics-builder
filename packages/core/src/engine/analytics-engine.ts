// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * AnalyticsEngine — Central orchestrator that wires together pivot, chart, KPI,
 * and report engines into a single coherent session.
 *
 * Usage:
 *   const engine = new AnalyticsEngine();
 *   engine.addDataset(dataset);
 *   const pivotResult = await engine.computePivot(pivotConfig);
 *   const kpiResult = await engine.computeKpi(kpiConfig);
 */

import type { Dataset, Row } from '../types/dataset.js';
import type { PivotConfig, PivotResult } from '../types/pivot.js';
import type { ChartConfig } from '../types/chart.js';
import type { KpiConfig, KpiResult, KpiDashboard } from '../types/kpi.js';
import type { ReportConfig, ReportRunResult, ScheduleConfig } from '../types/report.js';
import { EventBus } from './event-bus.js';
import { buildDataset } from '../types/dataset.js';

/** Engine options */
export interface AnalyticsEngineOptions {
  /** Whether to emit verbose debug events */
  debug?: boolean;
  /** Maximum number of datasets to hold in memory */
  maxDatasets?: number;
}

/** Engine state snapshot for serialization */
export interface EngineState {
  datasets: Dataset[];
  pivotConfigs: PivotConfig[];
  chartConfigs: ChartConfig[];
  kpiConfigs: KpiConfig[];
  dashboards: KpiDashboard[];
  reportConfigs: ReportConfig[];
}

/**
 * The main orchestrator for the analytics builder.
 * Manages datasets and configuration registries, delegates computation
 * to specialized engines (injected at runtime via adapters).
 */
export class AnalyticsEngine {
  readonly eventBus: EventBus;

  private readonly options: Required<AnalyticsEngineOptions>;

  // Registries — keyed by ID
  private readonly datasets = new Map<string, Dataset>();
  private readonly pivotConfigs = new Map<string, PivotConfig>();
  private readonly chartConfigs = new Map<string, ChartConfig>();
  private readonly kpiConfigs = new Map<string, KpiConfig>();
  private readonly dashboards = new Map<string, KpiDashboard>();
  private readonly reportConfigs = new Map<string, ReportConfig>();

  // Cached computation results
  private readonly pivotCache = new Map<string, PivotResult>();
  private readonly kpiCache = new Map<string, KpiResult>();

  // Injected computation adapters (set by specialized packages)
  private _pivotCompute?: (config: PivotConfig, dataset: Dataset) => PivotResult;
  private _kpiCompute?: (config: KpiConfig, dataset: Dataset) => KpiResult;
  private _chartDataCompute?: (config: ChartConfig, dataset: Dataset) => unknown[];
  private _reportGenerate?: (
    config: ReportConfig,
    engine: AnalyticsEngine
  ) => Promise<ReportRunResult>;

  private _destroyed = false;

  constructor(options: AnalyticsEngineOptions = {}) {
    this.options = {
      debug: false,
      maxDatasets: 50,
      ...options,
    };
    this.eventBus = new EventBus();
  }

  // ─── Adapter registration ─────────────────────────────────────────────────

  /** Register the pivot computation function */
  registerPivotEngine(fn: (config: PivotConfig, dataset: Dataset) => PivotResult): void {
    this._pivotCompute = fn;
  }

  /** Register the KPI computation function */
  registerKpiEngine(fn: (config: KpiConfig, dataset: Dataset) => KpiResult): void {
    this._kpiCompute = fn;
  }

  /** Register the chart data preparation function */
  registerChartEngine(fn: (config: ChartConfig, dataset: Dataset) => unknown[]): void {
    this._chartDataCompute = fn;
  }

  /** Register the report generation function */
  registerReportBuilder(
    fn: (config: ReportConfig, engine: AnalyticsEngine) => Promise<ReportRunResult>
  ): void {
    this._reportGenerate = fn;
  }

  // ─── Dataset management ───────────────────────────────────────────────────

  addDataset(dataset: Dataset): void {
    this._assertAlive();
    if (this.datasets.size >= this.options.maxDatasets) {
      throw new Error(
        `Maximum dataset count (${this.options.maxDatasets}) reached. Remove a dataset first.`
      );
    }
    this.datasets.set(dataset.id, dataset);
    this.eventBus.emit('dataset:added', { dataset });
  }

  /** Convenience: build a dataset from rows and add it */
  addDatasetFromRows(id: string, name: string, rows: Row[]): Dataset {
    const dataset = buildDataset(id, name, rows);
    this.addDataset(dataset);
    return dataset;
  }

  removeDataset(id: string): void {
    this._assertAlive();
    if (this.datasets.delete(id)) {
      // Invalidate caches that depended on this dataset
      for (const [configId, config] of this.pivotConfigs) {
        if (config.datasetId === id) this.pivotCache.delete(configId);
      }
      for (const [configId, config] of this.kpiConfigs) {
        if (config.datasetId === id) this.kpiCache.delete(configId);
      }
      this.eventBus.emit('dataset:removed', { datasetId: id });
    }
  }

  getDataset(id: string): Dataset | undefined {
    return this.datasets.get(id);
  }

  getAllDatasets(): Dataset[] {
    return Array.from(this.datasets.values());
  }

  // ─── Pivot config management ──────────────────────────────────────────────

  addPivotConfig(config: PivotConfig): void {
    this._assertAlive();
    this.pivotConfigs.set(config.id, config);
    this.pivotCache.delete(config.id); // Invalidate stale cache
    this.eventBus.emit('pivot:config:changed', { configId: config.id });
  }

  updatePivotConfig(id: string, updates: Partial<PivotConfig>): void {
    const existing = this.pivotConfigs.get(id);
    if (!existing) throw new Error(`Pivot config '${id}' not found`);
    this.pivotConfigs.set(id, { ...existing, ...updates, id });
    this.pivotCache.delete(id);
    this.eventBus.emit('pivot:config:changed', { configId: id });
  }

  removePivotConfig(id: string): void {
    this.pivotConfigs.delete(id);
    this.pivotCache.delete(id);
  }

  /** Compute a pivot table. Uses cache unless invalidated. */
  computePivot(configId: string, forceRefresh = false): PivotResult {
    this._assertAlive();
    if (!forceRefresh && this.pivotCache.has(configId)) {
      return this.pivotCache.get(configId)!;
    }
    const config = this.pivotConfigs.get(configId);
    if (!config) throw new Error(`Pivot config '${configId}' not found`);
    const dataset = this._requireDataset(config.datasetId);
    if (!this._pivotCompute) {
      throw new Error(
        'No pivot engine registered. Call engine.registerPivotEngine() first.'
      );
    }
    try {
      const result = this._pivotCompute(config, dataset);
      this.pivotCache.set(configId, result);
      this.eventBus.emit('pivot:computed', { result });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.eventBus.emit('pivot:error', { configId, error: err });
      throw err;
    }
  }

  // ─── Chart config management ──────────────────────────────────────────────

  addChartConfig(config: ChartConfig): void {
    this._assertAlive();
    this.chartConfigs.set(config.id, config);
    this.eventBus.emit('chart:config:changed', { chartId: config.id });
  }

  updateChartConfig(id: string, updates: Partial<ChartConfig>): void {
    const existing = this.chartConfigs.get(id);
    if (!existing) throw new Error(`Chart config '${id}' not found`);
    this.chartConfigs.set(id, { ...existing, ...updates, id });
    this.eventBus.emit('chart:config:changed', { chartId: id });
  }

  removeChartConfig(id: string): void {
    this.chartConfigs.delete(id);
  }

  /** Prepare chart data for rendering */
  prepareChartData(configId: string): unknown[] {
    this._assertAlive();
    const config = this.chartConfigs.get(configId);
    if (!config) throw new Error(`Chart config '${configId}' not found`);

    let dataset: Dataset;
    if (config.sourceType === 'pivot') {
      // If sourced from a pivot result, materialize pivot rows as dataset
      const pivotResult = this.pivotCache.get(config.sourceId);
      if (!pivotResult) {
        throw new Error(
          `Pivot result '${config.sourceId}' not found. Compute the pivot first.`
        );
      }
      // Flatten pivot rows to row objects for charting
      dataset = {
        id: `pivot-data-${config.sourceId}`,
        name: `Pivot ${config.sourceId}`,
        columns: [],
        rows: pivotResult.rows.map((r) => ({
          ...r.dimensions,
          ...Object.fromEntries(
            Object.entries(r.cells).map(([k, c]) => [k, c.value])
          ),
        })),
        source: { id: '', name: '', type: 'inline', rowCount: pivotResult.rowCount },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      dataset = this._requireDataset(config.sourceId);
    }

    if (!this._chartDataCompute) {
      // Default: return raw rows filtered by config filters
      return this._applyFilters(dataset.rows, config.filters);
    }
    const data = this._chartDataCompute(config, dataset);
    this.eventBus.emit('chart:data:ready', { chartId: configId, data });
    return data;
  }

  // ─── KPI config management ────────────────────────────────────────────────

  addKpiConfig(config: KpiConfig): void {
    this._assertAlive();
    this.kpiConfigs.set(config.id, config);
    this.kpiCache.delete(config.id);
  }

  updateKpiConfig(id: string, updates: Partial<KpiConfig>): void {
    const existing = this.kpiConfigs.get(id);
    if (!existing) throw new Error(`KPI config '${id}' not found`);
    this.kpiConfigs.set(id, { ...existing, ...updates, id });
    this.kpiCache.delete(id);
  }

  removeKpiConfig(id: string): void {
    this.kpiConfigs.delete(id);
    this.kpiCache.delete(id);
  }

  /** Compute a KPI value */
  computeKpi(configId: string, forceRefresh = false): KpiResult {
    this._assertAlive();
    if (!forceRefresh && this.kpiCache.has(configId)) {
      return this.kpiCache.get(configId)!;
    }
    const config = this.kpiConfigs.get(configId);
    if (!config) throw new Error(`KPI config '${configId}' not found`);
    const dataset = this._requireDataset(config.datasetId);

    if (!this._kpiCompute) {
      throw new Error('No KPI engine registered. Call engine.registerKpiEngine() first.');
    }
    try {
      const result = this._kpiCompute(config, dataset);
      const previous = this.kpiCache.get(configId);
      this.kpiCache.set(configId, result);
      this.eventBus.emit('kpi:computed', { result });

      // Detect threshold status changes
      if (previous && previous.status !== result.status) {
        this.eventBus.emit('kpi:threshold:crossed', {
          configId,
          previousStatus: previous.status,
          newStatus: result.status,
          value: result.value ?? 0,
        });
      }
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.eventBus.emit('kpi:error', { configId, error: err });
      throw err;
    }
  }

  /** Compute all registered KPIs and return results */
  computeAllKpis(forceRefresh = false): Map<string, KpiResult> {
    const results = new Map<string, KpiResult>();
    for (const id of this.kpiConfigs.keys()) {
      try {
        results.set(id, this.computeKpi(id, forceRefresh));
      } catch (_e) {
        // Individual KPI errors are emitted as events; keep computing others
      }
    }
    return results;
  }

  // ─── Dashboard management ─────────────────────────────────────────────────

  addDashboard(dashboard: KpiDashboard): void {
    this._assertAlive();
    this.dashboards.set(dashboard.id, dashboard);
  }

  getDashboard(id: string): KpiDashboard | undefined {
    return this.dashboards.get(id);
  }

  getAllDashboards(): KpiDashboard[] {
    return Array.from(this.dashboards.values());
  }

  // ─── Report management ────────────────────────────────────────────────────

  addReportConfig(config: ReportConfig): void {
    this._assertAlive();
    this.reportConfigs.set(config.id, config);
  }

  updateReportConfig(id: string, updates: Partial<ReportConfig>): void {
    const existing = this.reportConfigs.get(id);
    if (!existing) throw new Error(`Report config '${id}' not found`);
    this.reportConfigs.set(id, { ...existing, ...updates, id, updatedAt: new Date() });
  }

  addScheduleToReport(reportId: string, schedule: ScheduleConfig): void {
    const report = this.reportConfigs.get(reportId);
    if (!report) throw new Error(`Report '${reportId}' not found`);
    const existing = report.schedules.findIndex((s) => s.id === schedule.id);
    if (existing >= 0) {
      report.schedules[existing] = schedule;
    } else {
      report.schedules.push(schedule);
    }
  }

  async generateReport(configId: string): Promise<ReportRunResult> {
    this._assertAlive();
    const config = this.reportConfigs.get(configId);
    if (!config) throw new Error(`Report config '${configId}' not found`);

    if (!this._reportGenerate) {
      throw new Error(
        'No report builder registered. Call engine.registerReportBuilder() first.'
      );
    }
    try {
      const result = await this._reportGenerate(config, this);
      this.eventBus.emit('report:generated', { result });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.eventBus.emit('report:error', { reportId: configId, error: err });
      throw err;
    }
  }

  // ─── State serialization ──────────────────────────────────────────────────

  /** Export engine state for persistence */
  exportState(): EngineState {
    return {
      datasets: Array.from(this.datasets.values()),
      pivotConfigs: Array.from(this.pivotConfigs.values()),
      chartConfigs: Array.from(this.chartConfigs.values()),
      kpiConfigs: Array.from(this.kpiConfigs.values()),
      dashboards: Array.from(this.dashboards.values()),
      reportConfigs: Array.from(this.reportConfigs.values()),
    };
  }

  /** Restore engine state from a serialized snapshot */
  importState(state: EngineState): void {
    this._assertAlive();
    this.datasets.clear();
    this.pivotConfigs.clear();
    this.chartConfigs.clear();
    this.kpiConfigs.clear();
    this.dashboards.clear();
    this.reportConfigs.clear();
    this.pivotCache.clear();
    this.kpiCache.clear();

    for (const d of state.datasets) this.datasets.set(d.id, d);
    for (const p of state.pivotConfigs) this.pivotConfigs.set(p.id, p);
    for (const c of state.chartConfigs) this.chartConfigs.set(c.id, c);
    for (const k of state.kpiConfigs) this.kpiConfigs.set(k.id, k);
    for (const d of state.dashboards) this.dashboards.set(d.id, d);
    for (const r of state.reportConfigs) this.reportConfigs.set(r.id, r);

    this.eventBus.emit('engine:ready', {});
  }

  /** Teardown — remove all listeners and clear state */
  destroy(): void {
    this._destroyed = true;
    this.datasets.clear();
    this.pivotConfigs.clear();
    this.chartConfigs.clear();
    this.kpiConfigs.clear();
    this.dashboards.clear();
    this.reportConfigs.clear();
    this.pivotCache.clear();
    this.kpiCache.clear();
    this.eventBus.emit('engine:destroyed', {});
    this.eventBus.off();
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private _assertAlive(): void {
    if (this._destroyed) {
      throw new Error('AnalyticsEngine has been destroyed and cannot be used.');
    }
  }

  private _requireDataset(id: string): Dataset {
    const dataset = this.datasets.get(id);
    if (!dataset) throw new Error(`Dataset '${id}' not found in engine.`);
    return dataset;
  }

  private _applyFilters(rows: Row[], filters: import('../types/dataset.js').DataFilter[]): Row[] {
    if (!filters.length) return rows;
    return rows.filter((row) =>
      filters.every((filter) => {
        const val = row[filter.columnId];
        switch (filter.operator) {
          case 'eq': return val === filter.value;
          case 'neq': return val !== filter.value;
          case 'gt': return typeof val === 'number' && val > (filter.value as number);
          case 'gte': return typeof val === 'number' && val >= (filter.value as number);
          case 'lt': return typeof val === 'number' && val < (filter.value as number);
          case 'lte': return typeof val === 'number' && val <= (filter.value as number);
          case 'contains':
            return typeof val === 'string' && val.includes(filter.value as string);
          case 'notContains':
            return typeof val === 'string' && !val.includes(filter.value as string);
          case 'startsWith':
            return typeof val === 'string' && val.startsWith(filter.value as string);
          case 'endsWith':
            return typeof val === 'string' && val.endsWith(filter.value as string);
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(val as never);
          case 'notIn':
            return Array.isArray(filter.value) && !filter.value.includes(val as never);
          case 'isNull': return val == null;
          case 'isNotNull': return val != null;
          case 'between': {
            const [lo, hi] = filter.value as [number, number];
            return typeof val === 'number' && val >= lo && val <= hi;
          }
          default: return true;
        }
      })
    );
  }
}
