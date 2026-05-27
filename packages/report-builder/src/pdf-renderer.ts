// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * PDF renderer for reports.
 *
 * Produces real PDF bytes via pdf-lib so that the returned `data` (base64) is
 * a valid `.pdf` file. Sections are laid out as flowing text with simple
 * heading sizes; chart sections render as placeholder boxes (the chart engine
 * does not produce server-side images yet).
 *
 * Use `renderToHtml` if you want the printable-HTML output (browser print
 * dialog or Puppeteer pipeline).
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import type { ReportConfig, ReportRunResult, PageLayout } from '@gridstorm/analytix-core';
import type { ResolvedSection, RenderContext } from './types.js';

// ─── HTML renderer (kept for format === 'html' and Puppeteer pipelines) ──────

export function renderToHtml(
  config: ReportConfig,
  sections: ResolvedSection[],
  _ctx: RenderContext
): ReportRunResult {
  const start = performance.now();
  const pageStyle = buildPageStyle(config.pageLayout);
  const header = buildHeader(config);
  const footer = buildFooter(config);
  const bodyParts: string[] = sections.map((s) => s.html);
  const warnings: string[]  = sections.flatMap((s) => s.warnings);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(config.name)}</title>
<style>${pageStyle}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1a1a1a; margin:0; }
.section { margin-bottom: 24px; }
table { border-collapse: collapse; width: 100%; font-size: 12px; }
th { background:#6366f1; color:#fff; padding:6px 10px; text-align:left; }
td { padding:5px 10px; border-bottom:1px solid #e5e7eb; }
@media print { .page-break { page-break-after: always; } }
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

  const data = btoa(unescape(encodeURIComponent(html)));
  return {
    reportId: config.id,
    format:   'html',
    data,
    mimeType: 'text/html',
    filename: `${sanitizeFilename(config.name)}_${formatDateForFilename(new Date())}.html`,
    generatedAt: new Date(),
    durationMs: performance.now() - start,
    sectionCount: sections.length,
    warnings,
  };
}

// ─── Real PDF renderer ────────────────────────────────────────────────────────

// pdf-lib page sizes in points (1 mm ≈ 2.8346 pt; 1 in = 72 pt)
const PAGE_SIZES_PT: Record<string, [number, number]> = {
  A4:     [595.28,  841.89],
  A3:     [841.89, 1190.55],
  Letter: [612.00,  792.00],
  Legal:  [612.00, 1008.00],
};
const MM_TO_PT = 2.8346;

export async function renderToPdf(
  config: ReportConfig,
  sections: ResolvedSection[],
  _ctx: RenderContext
): Promise<ReportRunResult> {
  const start = performance.now();
  const warnings: string[] = sections.flatMap((s) => s.warnings);

  const doc      = await PDFDocument.create();
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const [pageWPt, pageHPt] = PAGE_SIZES_PT[config.pageLayout.size] ?? PAGE_SIZES_PT.A4;
  const orient = config.pageLayout.orientation === 'landscape';
  const W = orient ? pageHPt : pageWPt;
  const H = orient ? pageWPt : pageHPt;

  const m = {
    top:    config.pageLayout.marginTop    * MM_TO_PT,
    right:  config.pageLayout.marginRight  * MM_TO_PT,
    bottom: config.pageLayout.marginBottom * MM_TO_PT,
    left:   config.pageLayout.marginLeft   * MM_TO_PT,
  };
  const usableW = W - m.left - m.right;

  let pages: PDFPage[] = [doc.addPage([W, H])];
  let cursorY = H - m.top;

  const newPage = () => {
    pages.push(doc.addPage([W, H]));
    cursorY = H - m.top;
  };
  const ensure = (lines: number, lineH = 14) => {
    if (cursorY - lines * lineH < m.bottom + 30) newPage();
  };
  const currentPage = () => pages[pages.length - 1];

  const drawText = (text: string, size: number, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    const f: PDFFont = bold ? fontBold : font;
    const wrapped = wrapText(text, f, size, usableW);
    for (const line of wrapped) {
      const lineH = size * 1.4;
      ensure(1, lineH);
      currentPage().drawText(line, { x: m.left, y: cursorY - size, size, font: f, color });
      cursorY -= lineH;
    }
    cursorY -= 4;
  };

  const drawPlaceholderBox = (label: string, height = 100) => {
    ensure(1, height + 12);
    currentPage().drawRectangle({
      x: m.left, y: cursorY - height, width: usableW, height,
      borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 1,
    });
    currentPage().drawText(label, {
      x: m.left + 8, y: cursorY - 18, size: 10, font, color: rgb(0.4, 0.4, 0.4),
    });
    cursorY -= height + 12;
  };

  // ── Document header ───────────────────────────────────────────────────────
  drawText(config.headerTitle ?? config.name, 20, true);
  if (config.showTimestamp) {
    drawText(`Generated: ${new Date().toLocaleString()}`, 10, false, rgb(0.4, 0.4, 0.4));
  }
  cursorY -= 6;

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const section of sections) {
    const orig = section.section;
    switch (orig.type) {
      case 'title':
        drawText(orig.text, 20 - Math.min(orig.level - 1, 4) * 2, true);
        break;
      case 'text':
        drawText(orig.markdown.replace(/[*_]/g, ''), 11);
        break;
      case 'chart':
        drawPlaceholderBox(`Chart: ${orig.chartConfigId}`, orig.height ?? 200);
        break;
      case 'pivot-table':
        drawText(orig.caption ?? `Pivot table: ${orig.pivotConfigId}`, 12, true);
        drawPlaceholderBox(`Pivot data: ${orig.pivotConfigId}`, 120);
        break;
      case 'kpi-summary':
        drawText(`KPI summary: ${orig.kpiConfigIds.join(', ')}`, 12, true);
        break;
      case 'data-table':
        drawText(orig.caption ?? `Data table: ${orig.datasetId}`, 12, true);
        break;
      case 'page-break':
        newPage();
        break;
      case 'spacer':
        cursorY -= orig.height ?? 12;
        break;
    }
  }

  // ── Footer (page numbers) ─────────────────────────────────────────────────
  if (config.showPageNumbers || config.footerText) {
    const total = pages.length;
    pages.forEach((p, idx) => {
      const text = config.showPageNumbers
        ? `${config.footerText ? config.footerText + ' · ' : ''}Page ${idx + 1} of ${total}`
        : (config.footerText ?? '');
      p.drawText(text, {
        x: m.left, y: m.bottom / 2, size: 9, font,
        color: rgb(0.45, 0.45, 0.45),
      });
    });
  }

  const bytes = await doc.save();
  // Encode without spreading large arrays (avoids stack overflow)
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const data = typeof btoa !== 'undefined'
    ? btoa(bin)
    : Buffer.from(bytes).toString('base64');

  return {
    reportId: config.id,
    format:   'pdf',
    data,
    mimeType: 'application/pdf',
    filename: `${sanitizeFilename(config.name)}_${formatDateForFilename(new Date())}.pdf`,
    generatedAt: new Date(),
    durationMs:  performance.now() - start,
    sectionCount: sections.length,
    warnings,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
        if (line) out.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function buildPageStyle(layout: PageLayout): string {
  const sizes: Record<string, string> = {
    A4: '210mm 297mm', A3: '297mm 420mm', Letter: '8.5in 11in', Legal: '8.5in 14in',
  };
  const size = sizes[layout.size] ?? sizes.A4;
  return `@page { size: ${size} ${layout.orientation}; margin: ${layout.marginTop}mm ${layout.marginRight}mm ${layout.marginBottom}mm ${layout.marginLeft}mm; }`;
}

function buildHeader(config: ReportConfig): string {
  if (!config.headerTitle && !config.logoDataUri) return '';
  return `<div class="report-header"><h1>${escapeHtml(config.headerTitle ?? config.name)}</h1></div>`;
}

function buildFooter(config: ReportConfig): string {
  if (!config.footerText && !config.showPageNumbers) return '';
  return `<div class="report-footer">${escapeHtml(config.footerText ?? '')}</div>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\- ]/gi, '_').replace(/\s+/g, '_');
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10);
}
