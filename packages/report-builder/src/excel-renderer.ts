/**
 * Excel renderer for reports.
 *
 * Produces a CSV-compatible format encoded as base64.
 * In production, replace with exceljs or xlsx for full XLSX support.
 * Each pivot table / data table section becomes its own "sheet" as a
 * delimited block in the CSV output.
 */

import type { ReportConfig, ReportRunResult, PivotResult, Row } from '@analytix/core';
import type { ResolvedSection } from './types.js';
import { escapeHtml } from './pdf-renderer.js';

export function renderToExcel(
  config: ReportConfig,
  sections: ResolvedSection[],
  data: {
    pivotResults: Map<string, PivotResult>;
    dataRows: Map<string, Row[]>;
    kpiValues: Map<string, { label: string; value: string; status: string }>;
  }
): ReportRunResult {
  const start = performance.now();
  const warnings: string[] = [];
  const sheetBlocks: string[] = [];

  // Report title block
  sheetBlocks.push(buildCsvBlock([
    [config.name],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
  ]));

  // Process sections in order
  for (const resolved of sections) {
    const section = resolved.section;

    if (section.type === 'title') {
      sheetBlocks.push(buildCsvBlock([[`## ${section.text}`], []]));
    } else if (section.type === 'text') {
      sheetBlocks.push(buildCsvBlock([[section.markdown], []]));
    } else if (section.type === 'pivot-table') {
      const result = data.pivotResults.get(section.pivotConfigId);
      if (!result) {
        warnings.push(`Pivot result '${section.pivotConfigId}' not found for Excel export.`);
        continue;
      }
      sheetBlocks.push(buildPivotCsv(result, section.caption));
    } else if (section.type === 'data-table') {
      const rows = data.dataRows.get(section.datasetId);
      if (!rows || rows.length === 0) {
        warnings.push(`Dataset '${section.datasetId}' not found or empty.`);
        continue;
      }
      const limited = section.maxRows ? rows.slice(0, section.maxRows) : rows;
      sheetBlocks.push(buildDataTableCsv(limited, section.columnIds, section.caption));
    } else if (section.type === 'kpi-summary') {
      const kpiRows: string[][] = [
        section.caption ? [section.caption] : [],
        ['KPI', 'Value', 'Status'],
      ].filter((r) => r.length > 0);

      for (const kpiId of section.kpiConfigIds) {
        const kpi = data.kpiValues.get(kpiId);
        if (kpi) {
          kpiRows.push([kpi.label, kpi.value, kpi.status]);
        }
      }
      kpiRows.push([]);
      sheetBlocks.push(buildCsvBlock(kpiRows));
    } else if (section.type === 'page-break') {
      sheetBlocks.push(buildCsvBlock([['--- Page Break ---'], []]));
    }
    // Spacers and chart sections are skipped in Excel output
  }

  const csvContent = sheetBlocks.join('\n');
  const data64 = btoa(unescape(encodeURIComponent(csvContent)));
  const durationMs = performance.now() - start;

  void escapeHtml; // used in pdf-renderer, imported to share utilities

  return {
    reportId: config.id,
    format: 'excel',
    data: data64,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${sanitizeFilename(config.name)}_${formatDateForFilename(new Date())}.csv`,
    generatedAt: new Date(),
    durationMs,
    sectionCount: sections.length,
    warnings,
  };
}

function buildPivotCsv(result: PivotResult, caption?: string): string {
  const rows: string[][] = [];
  if (caption) rows.push([caption]);

  // Header row
  const headerRow = [''];
  for (const col of result.flatColumns) {
    headerRow.push(col.label);
  }
  rows.push(headerRow);

  // Data rows
  for (const row of result.rows) {
    const csvRow: string[] = [Object.values(row.dimensions).join(' › ')];
    for (const col of result.flatColumns) {
      const cell = row.cells[col.key];
      csvRow.push(cell?.formatted ?? '—');
    }
    rows.push(csvRow);
  }

  // Grand total
  if (result.grandTotalRow) {
    const totalRow: string[] = ['TOTAL'];
    for (const col of result.flatColumns) {
      const cell = result.grandTotalRow.cells[col.key];
      totalRow.push(cell?.formatted ?? '—');
    }
    rows.push(totalRow);
  }

  rows.push([]);
  return buildCsvBlock(rows);
}

function buildDataTableCsv(
  rows: Row[],
  columnIds?: string[],
  caption?: string
): string {
  const lines: string[][] = [];
  if (caption) lines.push([caption]);

  if (rows.length === 0) {
    lines.push(['No data']);
    lines.push([]);
    return buildCsvBlock(lines);
  }

  const cols = columnIds ?? Object.keys(rows[0]);
  lines.push(cols);
  for (const row of rows) {
    lines.push(cols.map((c) => String(row[c] ?? '')));
  }
  lines.push([]);
  return buildCsvBlock(lines);
}

function buildCsvBlock(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function csvEscape(val: string): string {
  if (/[,"\n\r]/.test(val)) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\- ]/gi, '_').replace(/\s+/g, '_');
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10);
}
