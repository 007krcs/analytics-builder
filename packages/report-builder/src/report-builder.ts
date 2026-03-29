/**
 * ReportBuilder — Fluent builder API for composing and scheduling reports.
 *
 * Usage:
 *   const report = new ReportBuilder('sales-report', 'Q1 Sales Report')
 *     .title('Q1 2024 Sales Performance', 1)
 *     .text('This report covers all sales activity in Q1 2024.')
 *     .addChart('chart-revenue')
 *     .addPivotTable('pivot-by-region')
 *     .addKpiSummary(['kpi-revenue', 'kpi-units', 'kpi-margin'])
 *     .pageBreak()
 *     .addDataTable('sales-dataset')
 *     .schedule(cronSchedule, ['pdf', 'excel'], delivery)
 *     .build();
 */

import type {
  ReportConfig,
  ReportSection,
  ReportFormat,
  ScheduleConfig,
  ScheduleDefinition,
  ReportDelivery,
  PageLayout,
  TitleSection,
  TextSection,
  ChartSection,
  PivotTableSection,
  KpiSummarySection,
  DataTableSection,
  PageBreakSection,
  SpacerSection,
} from '@analytix/core';

let sectionCounter = 0;
const nextSectionId = () => `section-${++sectionCounter}`;
const nextScheduleId = () => `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Fluent builder for ReportConfig.
 * All methods return `this` for chaining.
 */
export class ReportBuilder {
  private readonly config: ReportConfig;

  constructor(id: string, name: string, description?: string) {
    this.config = {
      id,
      name,
      description,
      sections: [],
      pageLayout: {
        size: 'A4',
        orientation: 'portrait',
        marginTop: 20,
        marginBottom: 20,
        marginLeft: 20,
        marginRight: 20,
      },
      showPageNumbers: true,
      showTimestamp: true,
      schedules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ─── Layout configuration ──────────────────────────────────────────────────

  pageLayout(layout: Partial<PageLayout>): this {
    Object.assign(this.config.pageLayout, layout);
    return this;
  }

  header(title: string): this {
    this.config.headerTitle = title;
    return this;
  }

  footer(text: string): this {
    this.config.footerText = text;
    return this;
  }

  logo(dataUri: string): this {
    this.config.logoDataUri = dataUri;
    return this;
  }

  withPageNumbers(show = true): this {
    this.config.showPageNumbers = show;
    return this;
  }

  withTimestamp(show = true): this {
    this.config.showTimestamp = show;
    return this;
  }

  // ─── Section builders ──────────────────────────────────────────────────────

  /** Add a heading section */
  title(text: string, level: 1 | 2 | 3 = 1): this {
    const section: TitleSection = {
      id: nextSectionId(),
      type: 'title',
      order: this.config.sections.length,
      text,
      level,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Add a markdown text section */
  text(markdown: string): this {
    const section: TextSection = {
      id: nextSectionId(),
      type: 'text',
      order: this.config.sections.length,
      markdown,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Add a chart section */
  addChart(
    chartConfigId: string,
    options?: { width?: number; height?: number; caption?: string }
  ): this {
    const section: ChartSection = {
      id: nextSectionId(),
      type: 'chart',
      order: this.config.sections.length,
      chartConfigId,
      ...options,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Add a pivot table section */
  addPivotTable(
    pivotConfigId: string,
    options?: { caption?: string; maxRows?: number }
  ): this {
    const section: PivotTableSection = {
      id: nextSectionId(),
      type: 'pivot-table',
      order: this.config.sections.length,
      pivotConfigId,
      ...options,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Add a KPI summary grid section */
  addKpiSummary(
    kpiConfigIds: string[],
    options?: { columns?: number; caption?: string }
  ): this {
    const section: KpiSummarySection = {
      id: nextSectionId(),
      type: 'kpi-summary',
      order: this.config.sections.length,
      kpiConfigIds,
      columns: options?.columns ?? 3,
      caption: options?.caption,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Add a raw data table section */
  addDataTable(
    datasetId: string,
    options?: { columnIds?: string[]; maxRows?: number; caption?: string }
  ): this {
    const section: DataTableSection = {
      id: nextSectionId(),
      type: 'data-table',
      order: this.config.sections.length,
      datasetId,
      ...options,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Insert a page break (PDF only) */
  pageBreak(): this {
    const section: PageBreakSection = {
      id: nextSectionId(),
      type: 'page-break',
      order: this.config.sections.length,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Insert vertical spacing */
  spacer(height = 24): this {
    const section: SpacerSection = {
      id: nextSectionId(),
      type: 'spacer',
      order: this.config.sections.length,
      height,
    };
    this.config.sections.push(section);
    return this;
  }

  /** Add a pre-built section directly */
  addSection(section: Omit<ReportSection, 'id' | 'order'>): this {
    this.config.sections.push({
      ...section,
      id: nextSectionId(),
      order: this.config.sections.length,
    } as ReportSection);
    return this;
  }

  /** Remove a section by id */
  removeSection(id: string): this {
    this.config.sections = this.config.sections.filter((s) => s.id !== id);
    // Re-number orders
    this.config.sections.forEach((s, i) => { s.order = i; });
    return this;
  }

  /** Move a section up or down by delta positions */
  moveSection(id: string, delta: number): this {
    const idx = this.config.sections.findIndex((s) => s.id === id);
    if (idx < 0) return this;
    const newIdx = Math.max(0, Math.min(this.config.sections.length - 1, idx + delta));
    const [section] = this.config.sections.splice(idx, 1);
    this.config.sections.splice(newIdx, 0, section);
    this.config.sections.forEach((s, i) => { s.order = i; });
    return this;
  }

  // ─── Scheduling ────────────────────────────────────────────────────────────

  /** Attach a schedule to this report */
  schedule(
    scheduleDef: ScheduleDefinition,
    formats: ReportFormat[],
    delivery: ReportDelivery,
    options?: { name?: string; enabled?: boolean }
  ): this {
    const scheduleConfig: ScheduleConfig = {
      id: nextScheduleId(),
      name: options?.name ?? `Auto-schedule ${this.config.schedules.length + 1}`,
      enabled: options?.enabled ?? true,
      schedule: scheduleDef,
      formats,
      delivery,
      runCount: 0,
    };
    this.config.schedules.push(scheduleConfig);
    return this;
  }

  /** Remove a schedule by id */
  removeSchedule(id: string): this {
    this.config.schedules = this.config.schedules.filter((s) => s.id !== id);
    return this;
  }

  // ─── Build ─────────────────────────────────────────────────────────────────

  /** Finalize and return the immutable ReportConfig */
  build(): ReportConfig {
    return {
      ...this.config,
      sections: [...this.config.sections],
      schedules: [...this.config.schedules],
      updatedAt: new Date(),
    };
  }

  /** Clone the builder with a new ID */
  clone(newId: string, newName?: string): ReportBuilder {
    const clone = new ReportBuilder(newId, newName ?? `${this.config.name} (copy)`);
    clone.config.sections = this.config.sections.map((s) => ({
      ...s,
      id: nextSectionId(),
    })) as ReportSection[];
    clone.config.pageLayout = { ...this.config.pageLayout };
    clone.config.headerTitle = this.config.headerTitle;
    clone.config.footerText = this.config.footerText;
    clone.config.showPageNumbers = this.config.showPageNumbers;
    clone.config.showTimestamp = this.config.showTimestamp;
    return clone;
  }
}

/**
 * Top-level report generation function — resolves sections and calls
 * the appropriate renderer.
 */
export async function generateReport(
  config: ReportConfig,
  engine: import('@analytix/core').AnalyticsEngine,
  format: ReportFormat = 'pdf'
): Promise<import('@analytix/core').ReportRunResult> {
  const { renderToPdf } = await import('./pdf-renderer.js');
  const { renderToExcel } = await import('./excel-renderer.js');

  // Resolve all sections to HTML
  const resolvedSections = await resolveSections(config, engine);

  const ctx = buildRenderContext(config, engine);

  if (format === 'pdf' || format === 'html') {
    return renderToPdf(config, resolvedSections, ctx);
  }

  if (format === 'excel' || format === 'csv') {
    // Gather data for Excel renderer
    const pivotResults = new Map<string, import('@analytix/core').PivotResult>();
    const dataRows = new Map<string, import('@analytix/core').Row[]>();
    const kpiValues = new Map<string, { label: string; value: string; status: string }>();

    for (const section of config.sections) {
      if (section.type === 'pivot-table') {
        try {
          const result = engine.computePivot(section.pivotConfigId);
          pivotResults.set(section.pivotConfigId, result);
        } catch (_e) { /* skip */ }
      } else if (section.type === 'data-table') {
        const ds = engine.getDataset(section.datasetId);
        if (ds) dataRows.set(section.datasetId, ds.rows);
      } else if (section.type === 'kpi-summary') {
        for (const kpiId of section.kpiConfigIds) {
          try {
            const result = engine.computeKpi(kpiId);
            kpiValues.set(kpiId, {
              label: kpiId,
              value: result.formatted,
              status: result.status,
            });
          } catch (_e) { /* skip */ }
        }
      }
    }

    return renderToExcel(config, resolvedSections, { pivotResults, dataRows, kpiValues });
  }

  throw new Error(`Unsupported report format: ${format}`);
}

async function resolveSections(
  config: ReportConfig,
  _engine: import('@analytix/core').AnalyticsEngine
): Promise<import('./types.js').ResolvedSection[]> {
  const { escapeHtml } = await import('./pdf-renderer.js');

  return config.sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((section) => {
      const warnings: string[] = [];
      let html = '';

      switch (section.type) {
        case 'title':
          html = `<div class="section"><h${section.level}>${escapeHtml(section.text)}</h${section.level}></div>`;
          break;
        case 'text':
          // Very basic markdown → HTML (bold, italic, line breaks)
          html = `<div class="section"><p>${section.markdown
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')}</p></div>`;
          break;
        case 'chart':
          html = `<div class="section">${section.caption ? `<p><em>${escapeHtml(section.caption)}</em></p>` : ''}
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;height:${section.height ?? 300}px;display:flex;align-items:center;justify-content:center;color:#6b7280">
              [Chart: ${escapeHtml(section.chartConfigId)}]
            </div></div>`;
          break;
        case 'pivot-table':
          html = `<div class="section">${section.caption ? `<h3>${escapeHtml(section.caption)}</h3>` : ''}
            <p><em>Pivot table: ${escapeHtml(section.pivotConfigId)}</em></p></div>`;
          break;
        case 'kpi-summary':
          html = `<div class="section kpi-grid">${section.kpiConfigIds.map((id) =>
            `<div class="kpi-card"><div class="label">${escapeHtml(id)}</div><div class="value">—</div></div>`
          ).join('')}</div>`;
          break;
        case 'data-table':
          html = `<div class="section"><p><em>Data table: ${escapeHtml(section.datasetId)}</em></p></div>`;
          break;
        case 'page-break':
          html = '<div class="page-break"></div>';
          break;
        case 'spacer':
          html = `<div style="height:${section.height}px"></div>`;
          break;
        default:
          warnings.push(`Unknown section type: ${(section as ReportSection).type}`);
      }

      return { section, html, warnings };
    });
}

function buildRenderContext(
  config: ReportConfig,
  engine: import('@analytix/core').AnalyticsEngine
): import('./types.js').RenderContext {
  return {
    reportId: config.id,
    getData: (datasetId) => engine.getDataset(datasetId)?.rows ?? null,
    getPivotResult: (pivotId) => {
      try { return engine.computePivot(pivotId); } catch { return null; }
    },
    getKpiResult: (kpiId) => {
      try { return engine.computeKpi(kpiId); } catch { return null; }
    },
  };
}
