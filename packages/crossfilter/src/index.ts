/**
 * @analytix/crossfilter
 *
 * Cross-widget filtering engine + React bindings.
 * Click any chart element to instantly filter ALL other charts on the dashboard.
 */

export { CrossFilterEngine, crossFilterEngine } from './crossfilter-engine.js';
export { FilterRegistry }                       from './filter-registry.js';

// React bindings
export { CrossFilterProvider }      from './react/CrossFilterProvider.js';
export { useCrossFilter }           from './react/useCrossFilter.js';
export { withCrossFilter }          from './react/withCrossFilter.js';

export type {
  FilterSelection,
  DatasetFilterState,
  CrossFilterState,
  CrossFilterEvent,
  CrossFilterCallback,
  WidgetRegistration,
  CellValue,
  Row,
} from './filter-types.js';

export type {
  CrossFilterInjectedProps,
  WithCrossFilterOptions,
} from './react/withCrossFilter.js';

export type { CrossFilterProviderProps } from './react/CrossFilterProvider.js';
export type { UseCrossFilterReturn }     from './react/useCrossFilter.js';
