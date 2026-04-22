// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Internal types for report-builder.
 */

import type { ReportSection } from '@gridstorm/analytix-core';

/** Resolved section with all data fetched */
export interface ResolvedSection {
  section: ReportSection;
  /** Rendered HTML string for this section */
  html: string;
  /** Any warnings generated during rendering */
  warnings: string[];
}

/** Context passed to each section renderer */
export interface RenderContext {
  reportId: string;
  /** Engine instance for fetching data */
  getData: (datasetId: string) => import('@gridstorm/analytix-core').Row[] | null;
  getPivotResult: (pivotId: string) => import('@gridstorm/analytix-core').PivotResult | null;
  getKpiResult: (kpiId: string) => import('@gridstorm/analytix-core').KpiResult | null;
}
