/**
 * Types for @gridstorm/analytix-crossfilter
 */

import type { CellValue, Row } from '@gridstorm/analytix-core';

/** A filter selection from one widget on one column */
export interface FilterSelection {
  /** The widget that set this filter */
  sourceWidgetId: string;
  /** The dataset this filter applies to */
  datasetId: string;
  /** The column being filtered */
  column: string;
  /** The values to include (empty = no filter) */
  values: Set<CellValue>;
}

/** Complete filter state for one dataset: column → set of allowed values */
export type DatasetFilterState = Map<string, Set<CellValue>>;

/** Complete cross-filter state: datasetId → DatasetFilterState */
export type CrossFilterState = Map<string, DatasetFilterState>;

/** Event fired when filter state changes */
export interface CrossFilterEvent {
  type: 'filter-set' | 'filter-cleared' | 'all-cleared';
  sourceWidgetId: string;
  datasetId: string;
  column?: string;
  values?: CellValue[];
  /** Full new state snapshot */
  state: CrossFilterState;
}

/** Callback for filter change subscriptions */
export type CrossFilterCallback = (event: CrossFilterEvent) => void;

/** Widget registration info */
export interface WidgetRegistration {
  widgetId: string;
  datasetId: string;
}

// Re-export for convenience
export type { CellValue, Row };
