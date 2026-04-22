// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * useCrossFilter — React hook for cross-widget filtering.
 *
 * Usage:
 *   const { filteredRows, setFilter, clearFilter, isFiltered, filterCount } =
 *     useCrossFilter('widget-bar-1', 'sales', allRows);
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCrossFilterEngine } from './CrossFilterProvider.js';
import type { Row, CellValue } from '@gridstorm/analytix-core';
import type { DatasetFilterState } from '../filter-types.js';

export interface UseCrossFilterReturn {
  /** Rows after all OTHER widgets' filters are applied (not this widget's own) */
  filteredRows: Row[];
  /** Current filter state for the dataset */
  activeFilters: DatasetFilterState;
  /** Set this widget's filter on a column */
  setFilter: (column: string, values: CellValue[]) => void;
  /** Clear this widget's filter */
  clearFilter: () => void;
  /** True if any cross-filter is currently active for this dataset */
  isFiltered: boolean;
  /** Number of active filter dimensions */
  filterCount: number;
}

export function useCrossFilter(
  widgetId: string,
  datasetId: string,
  allRows: Row[]
): UseCrossFilterReturn {
  const engine      = useCrossFilterEngine();
  const allRowsRef  = useRef(allRows);
  allRowsRef.current = allRows;

  const [tick, setTick] = useState(0);

  // Register / unregister the widget
  useEffect(() => {
    const unregister = engine.registerWidget(widgetId, datasetId);
    return () => {
      unregister();
      engine.clearFilter(widgetId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId, datasetId]);

  // Subscribe to filter changes
  useEffect(() => {
    const unsub = engine.subscribe((event) => {
      if (event.datasetId === datasetId || event.type === 'all-cleared') {
        setTick((t) => t + 1);
      }
    });
    return unsub;
  }, [engine, datasetId]);

  const filteredRows  = engine.getFilteredRows(datasetId, allRowsRef.current, widgetId);
  const activeFilters = engine.getActiveFilters(datasetId);
  const isFiltered    = engine.isFiltered(datasetId);
  const filterCount   = engine.filterCount(datasetId);

  // Suppress unused-var warning on tick — it's used to trigger re-render
  void tick;

  const setFilter = useCallback(
    (column: string, values: CellValue[]) => engine.setFilter(widgetId, column, values),
    [engine, widgetId]
  );

  const clearFilter = useCallback(
    () => engine.clearFilter(widgetId),
    [engine, widgetId]
  );

  return { filteredRows, activeFilters, setFilter, clearFilter, isFiltered, filterCount };
}
