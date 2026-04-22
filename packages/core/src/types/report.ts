// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Report configuration and scheduling types.
 */

/** Supported report output formats */
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'html';

/** A section in a report */
export type ReportSectionType =
  | 'title'
  | 'text'
  | 'chart'
  | 'pivot-table'
  | 'kpi-summary'
  | 'data-table'
  | 'page-break'
  | 'spacer';

/** Base section */
interface BaseSection {
  id: string;
  type: ReportSectionType;
  /** Ordering index */
  order: number;
}

/** Title / heading section */
export interface TitleSection extends BaseSection {
  type: 'title';
  text: string;
  level: 1 | 2 | 3;
}

/** Free-text / markdown section */
export interface TextSection extends BaseSection {
  type: 'text';
  markdown: string;
}

/** Chart section embeds a rendered chart */
export interface ChartSection extends BaseSection {
  type: 'chart';
  chartConfigId: string;
  width?: number;
  height?: number;
  caption?: string;
}

/** Pivot table section */
export interface PivotTableSection extends BaseSection {
  type: 'pivot-table';
  pivotConfigId: string;
  caption?: string;
  /** Max rows to render (truncated if exceeded) */
  maxRows?: number;
}

/** KPI summary section */
export interface KpiSummarySection extends BaseSection {
  type: 'kpi-summary';
  kpiConfigIds: string[];
  columns: number;
  caption?: string;
}

/** Raw data table section */
export interface DataTableSection extends BaseSection {
  type: 'data-table';
  datasetId: string;
  /** Column IDs to include (all if omitted) */
  columnIds?: string[];
  maxRows?: number;
  caption?: string;
}

export interface PageBreakSection extends BaseSection {
  type: 'page-break';
}

export interface SpacerSection extends BaseSection {
  type: 'spacer';
  height: number;
}

export type ReportSection =
  | TitleSection
  | TextSection
  | ChartSection
  | PivotTableSection
  | KpiSummarySection
  | DataTableSection
  | PageBreakSection
  | SpacerSection;

/** Cron-style schedule definition */
export interface CronSchedule {
  type: 'cron';
  /** Standard 5-field cron expression */
  expression: string;
  /** IANA timezone */
  timezone: string;
}

/** Interval-based schedule */
export interface IntervalSchedule {
  type: 'interval';
  /** Interval in minutes */
  intervalMinutes: number;
}

/** One-time schedule */
export interface OneTimeSchedule {
  type: 'once';
  at: Date;
}

export type ScheduleDefinition = CronSchedule | IntervalSchedule | OneTimeSchedule;

/** Delivery configuration for scheduled reports */
export interface ReportDelivery {
  /** Email recipients */
  emailTo?: string[];
  /** Subject line template */
  emailSubject?: string;
  /** Whether to embed the report inline (PDF) or as attachment */
  emailBody?: string;
  /** Webhook URL to POST the report to */
  webhookUrl?: string;
  /** Whether to save to local storage / file system */
  saveLocally?: boolean;
  localPath?: string;
}

/** Report schedule configuration */
export interface ScheduleConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule: ScheduleDefinition;
  formats: ReportFormat[];
  delivery: ReportDelivery;
  /** Timestamp of next scheduled run */
  nextRunAt?: Date;
  /** Timestamp of last run */
  lastRunAt?: Date;
  /** Number of times run */
  runCount: number;
}

/** Page size and orientation for PDF export */
export interface PageLayout {
  size: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

/** Full report configuration */
export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  sections: ReportSection[];
  pageLayout: PageLayout;
  /** Report-level title for PDF header */
  headerTitle?: string;
  /** Footer text */
  footerText?: string;
  /** Whether to include page numbers */
  showPageNumbers: boolean;
  /** Whether to include a generated timestamp */
  showTimestamp: boolean;
  /** Logo image data URI */
  logoDataUri?: string;
  schedules: ScheduleConfig[];
  createdAt: Date;
  updatedAt: Date;
}

/** Result of a report generation run */
export interface ReportRunResult {
  reportId: string;
  scheduleId?: string;
  format: ReportFormat;
  /** Base64-encoded output for PDF/Excel */
  data: string;
  mimeType: string;
  filename: string;
  generatedAt: Date;
  durationMs: number;
  sectionCount: number;
  warnings: string[];
}
