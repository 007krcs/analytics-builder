/**
 * PDF renderer for reports.
 *
 * In a full production implementation this would use a headless Chromium or
 * a PDF library such as pdf-lib / jspdf. Here we produce a well-structured
 * HTML string that can be printed to PDF via the browser print dialog or
 * Puppeteer, and encode it as base64 for transport.
 */

import type { ReportConfig, ReportRunResult, PageLayout } from '@gridstorm/analytix-core';
import type { ResolvedSection, RenderContext } from './types.js';

export function renderToPdf(
  config: ReportConfig,
  sections: ResolvedSection[],
  _ctx: RenderContext
): ReportRunResult {
  const start = performance.now();

  const pageStyle = buildPageStyle(config.pageLayout);
  const header = buildHeader(config);
  const footer = buildFooter(config);

  const bodyParts: string[] = sections.map((s) => s.html);
  const warnings: string[] = sections.flatMap((s) => s.warnings);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.name)}</title>
<style>
${pageStyle}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a1a1a;
  background: #fff;
  margin: 0;
  padding: 0;
}
.report-header {
  border-bottom: 2px solid #6366f1;
  padding-bottom: 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.report-header h1 { margin: 0; font-size: 22px; color: #1a1a1a; }
.report-footer {
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  margin-top: 24px;
  font-size: 11px;
  color: #6b7280;
  display: flex;
  justify-content: space-between;
}
.section { margin-bottom: 24px; }
h1 { font-size: 20px; margin: 0 0 8px; }
h2 { font-size: 16px; margin: 0 0 8px; }
h3 { font-size: 14px; margin: 0 0 8px; }
table { border-collapse: collapse; width: 100%; font-size: 12px; }
th { background: #6366f1; color: #fff; padding: 6px 10px; text-align: left; }
td { padding: 5px 10px; border-bottom: 1px solid #e5e7eb; }
tr:nth-child(even) td { background: #f9fafb; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
.kpi-card .value { font-size: 28px; font-weight: 700; color: #1a1a1a; }
.kpi-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
.kpi-card.status-good { border-left: 4px solid #22c55e; }
.kpi-card.status-warning { border-left: 4px solid #f59e0b; }
.kpi-card.status-critical { border-left: 4px solid #ef4444; }
@media print {
  .page-break { page-break-after: always; }
}
</style>
</head>
<body>
${header}
<div class="report-body">
${bodyParts.join('\n')}
</div>
${footer}
</body>
</html>`;

  // Encode as base64
  const data = btoa(unescape(encodeURIComponent(html)));
  const durationMs = performance.now() - start;

  return {
    reportId: config.id,
    format: 'pdf',
    data,
    mimeType: 'application/pdf',
    filename: `${sanitizeFilename(config.name)}_${formatDateForFilename(new Date())}.pdf`,
    generatedAt: new Date(),
    durationMs,
    sectionCount: sections.length,
    warnings,
  };
}

function buildPageStyle(layout: PageLayout): string {
  const sizes: Record<string, string> = {
    A4: '210mm 297mm',
    A3: '297mm 420mm',
    Letter: '8.5in 11in',
    Legal: '8.5in 14in',
  };
  const size = sizes[layout.size] ?? sizes.A4;
  return `@page {
  size: ${size} ${layout.orientation};
  margin: ${layout.marginTop}mm ${layout.marginRight}mm ${layout.marginBottom}mm ${layout.marginLeft}mm;
}`;
}

function buildHeader(config: ReportConfig): string {
  if (!config.headerTitle && !config.logoDataUri) return '';
  return `<div class="report-header">
  <div>
    <h1>${escapeHtml(config.headerTitle ?? config.name)}</h1>
    ${config.showTimestamp ? `<div style="font-size:11px;color:#6b7280">Generated: ${new Date().toLocaleString()}</div>` : ''}
  </div>
  ${config.logoDataUri ? `<img src="${config.logoDataUri}" style="height:40px" alt="logo">` : ''}
</div>`;
}

function buildFooter(config: ReportConfig): string {
  if (!config.footerText && !config.showPageNumbers) return '';
  return `<div class="report-footer">
  <span>${escapeHtml(config.footerText ?? '')}</span>
  ${config.showPageNumbers ? '<span class="page-number">Page <span class="current-page"></span></span>' : ''}
</div>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\- ]/gi, '_').replace(/\s+/g, '_');
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10);
}
