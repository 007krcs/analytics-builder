/**
 * CrossFilterEngine — Central filter state manager.
 *
 * Architecture:
 *   state: Map<datasetId, Map<column, Map<sourceWidgetId, Set<value>>>>
 *
 * When getFilteredRows() is called for widgetId W, it applies all column
 * filters EXCEPT those whose sole source is W itself (so a widget sees
 * the effect of every OTHER widget's filter, but not its own).
 */

import type { Row, CellValue } from '@analytix/core';
import { FilterRegistry }     from './filter-registry.js';
import type {
  CrossFilterState,
  DatasetFilterState,
  CrossFilterEvent,
  CrossFilterCallback,
} from './filter-types.js';

type ColumnFilterMap = Map<string, Map<string, Set<CellValue>>>;
//                         column   sourceWidget  values

export class CrossFilterEngine {
  private readonly registry     = new FilterRegistry();
  private readonly _state       = new Map<string, ColumnFilterMap>();
  private readonly _subscribers = new Set<CrossFilterCallback>();

  // ── Registration ────────────────────────────────────────────

  registerWidget(widgetId: string, datasetId: string): () => void {
    return this.registry.register(widgetId, datasetId);
  }

  // ── Filter mutations ─────────────────────────────────────────

  setFilter(sourceWidgetId: string, column: string, values: CellValue[]): void {
    const datasetId = this.registry.getDatasetId(sourceWidgetId);
    if (!datasetId) return;

    if (!this._state.has(datasetId)) {
      this._state.set(datasetId, new Map());
    }
    const colMap = this._state.get(datasetId)!;

    if (!colMap.has(column)) {
      colMap.set(column, new Map());
    }
    const widgetMap = colMap.get(column)!;

    if (values.length === 0) {
      widgetMap.delete(sourceWidgetId);
      if (widgetMap.size === 0) colMap.delete(column);
    } else {
      widgetMap.set(sourceWidgetId, new Set(values));
    }

    this._emit({
      type: 'filter-set',
      sourceWidgetId,
      datasetId,
      column,
      values,
      state: this._snapshot(),
    });
  }

  clearFilter(widgetId?: string): void {
    if (widgetId === undefined) {
      this._state.clear();
      this._emit({
        type: 'all-cleared',
        sourceWidgetId: '',
        datasetId: '',
        state: this._snapshot(),
      });
      return;
    }

    const datasetId = this.registry.getDatasetId(widgetId);
    if (!datasetId) return;

    const colMap = this._state.get(datasetId);
    if (!colMap) return;

    const columnsCleared: string[] = [];
    for (const [col, widgetMap] of colMap) {
      if (widgetMap.has(widgetId)) {
        widgetMap.delete(widgetId);
        columnsCleared.push(col);
        if (widgetMap.size === 0) colMap.delete(col);
      }
    }
    if (colMap.size === 0) this._state.delete(datasetId);

    this._emit({
      type: 'filter-cleared',
      sourceWidgetId: widgetId,
      datasetId,
      state: this._snapshot(),
    });
  }

  // ── Query ─────────────────────────────────────────────────────

  /**
   * Return the subset of rows that pass all active cross-filters,
   * EXCLUDING the requesting widget's own filters.
   */
  getFilteredRows(datasetId: string, rows: Row[], excludeWidgetId?: string): Row[] {
    const colMap = this._state.get(datasetId);
    if (!colMap || colMap.size === 0) return rows;

    return rows.filter((row) => {
      for (const [col, widgetMap] of colMap) {
        // Build combined set of allowed values from all OTHER widgets
        const allowed = new Set<CellValue>();
        let hasActiveFilter = false;
        for (const [wid, vals] of widgetMap) {
          if (wid !== excludeWidgetId) {
            vals.forEach((v) => allowed.add(v));
            hasActiveFilter = true;
          }
        }
        if (!hasActiveFilter) continue;
        if (!allowed.has(row[col])) return false;
      }
      return true;
    });
  }

  /**
   * Returns a read-only snapshot of current filter state per dataset.
   */
  getActiveFilters(datasetId: string): DatasetFilterState {
    const result: DatasetFilterState = new Map();
    const colMap = this._state.get(datasetId);
    if (!colMap) return result;

    for (const [col, widgetMap] of colMap) {
      const combined = new Set<CellValue>();
      for (const vals of widgetMap.values()) {
        vals.forEach((v) => combined.add(v));
      }
      if (combined.size > 0) result.set(col, combined);
    }
    return result;
  }

  /** True if any filter is active for the given dataset */
  isFiltered(datasetId: string): boolean {
    const colMap = this._state.get(datasetId);
    return !!colMap && colMap.size > 0;
  }

  /** Number of active filter dimensions for a dataset */
  filterCount(datasetId: string): number {
    return this._state.get(datasetId)?.size ?? 0;
  }

  // ── Subscriptions ─────────────────────────────────────────────

  subscribe(callback: CrossFilterCallback): () => void {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  // ── Internals ─────────────────────────────────────────────────

  private _emit(event: CrossFilterEvent): void {
    for (const cb of this._subscribers) {
      try { cb(event); } catch { /* ignore subscriber errors */ }
    }
  }

  private _snapshot(): CrossFilterState {
    const snap: CrossFilterState = new Map();
    for (const [dsId, colMap] of this._state) {
      const dsSnap: DatasetFilterState = new Map();
      for (const [col, widgetMap] of colMap) {
        const combined = new Set<CellValue>();
        for (const vals of widgetMap.values()) vals.forEach((v) => combined.add(v));
        dsSnap.set(col, combined);
      }
      snap.set(dsId, dsSnap);
    }
    return snap;
  }
}

/** Shared singleton — use this in React context */
export const crossFilterEngine = new CrossFilterEngine();
