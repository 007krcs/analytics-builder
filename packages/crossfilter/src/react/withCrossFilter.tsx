/**
 * withCrossFilter — HOC that injects cross-filter props into any chart component.
 */

import { useCrossFilter } from './useCrossFilter.js';
import type { Row, CellValue } from '@gridstorm/analytix-core';
import type { DatasetFilterState } from '../filter-types.js';

export interface CrossFilterInjectedProps {
  filteredRows: Row[];
  activeFilters: DatasetFilterState;
  setFilter: (column: string, values: CellValue[]) => void;
  clearFilter: () => void;
  isFiltered: boolean;
  filterCount: number;
}

export interface WithCrossFilterOptions {
  widgetId: string;
  datasetId: string;
}

/**
 * Wrap a component to automatically receive cross-filter props.
 *
 * @example
 * const CrossFilteredBarChart = withCrossFilter(BarChart, {
 *   widgetId: 'bar-1',
 *   datasetId: 'sales',
 * });
 * // Then use: <CrossFilteredBarChart rows={allRows} ... />
 */
export function withCrossFilter<P extends CrossFilterInjectedProps>(
  Component: React.ComponentType<P>,
  { widgetId, datasetId }: WithCrossFilterOptions
): React.ComponentType<Omit<P, keyof CrossFilterInjectedProps> & { rows: Row[] }> {
  function WrappedComponent(props: Omit<P, keyof CrossFilterInjectedProps> & { rows: Row[] }) {
    const { rows, ...rest } = props;
    const crossFilter = useCrossFilter(widgetId, datasetId, rows);

    return (
      <Component
        {...(rest as unknown as P)}
        filteredRows={crossFilter.filteredRows}
        activeFilters={crossFilter.activeFilters}
        setFilter={crossFilter.setFilter}
        clearFilter={crossFilter.clearFilter}
        isFiltered={crossFilter.isFiltered}
        filterCount={crossFilter.filterCount}
      />
    );
  }

  WrappedComponent.displayName = `WithCrossFilter(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WrappedComponent;
}
