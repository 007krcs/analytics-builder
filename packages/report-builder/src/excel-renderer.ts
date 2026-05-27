// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Excel renderer for reports.
 *
 * Produces a real .xlsx (ZIP + XML) file via SheetJS, with one sheet per
 * section type. Falls back to a CSV-style sheet representation only when
 * SheetJS is unavailable.
 */

import * as XLSX from 'xlsx';

import type { ReportConfig, ReportRunResult, PivotResult, Row } from '@gridstorm/analytix-core';
import type { ResolvedSection } from './types.js';

interface SheetData {
  name: string;
  rows: (string | number)[][];
}

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
  const sheets: SheetData[] = [];

  // Cover sheet
  sheets.push({
    name: safeSheetName('Cover'),
    rows: [
      [config.name],
      [`Generated: ${new Date().toLocaleString()}`],
      ...(config.headerTitle ? [['Title', config.headerTitle]] : []),
    ],
  });

  // Track unique sheet names — Excel forbids duplicates
  const usedNames = new Set<string>(['Cover']);
  const uniq = (base: string) => {
    let n = safeSheetName(base);
    let i = 2;
    while (usedNames.has(n)) n = safeSheetName(`${base} (${i++})`);
    usedNames.add(n);
    return n;
  };

  // Pre-collect notes that go on a "Narrative" sheet
  const narrativeRows: (string | number)[][] = [];

  for (const resolved of sections) {
    const s = resolved.section;
    switch (s.type) {
      case 'title':
        narrativeRows.push([`${'#'.repeat(s.level)} ${s.text}`]);
        break;
      case 'text':
        narrativeRows.push([s.markdown]);
        break;
      case 'kpi-summary': {
        const rows: (string | number)[][] = [];
        if (s.caption) rows.push([s.caption]);
        rows.push(['KPI', 'Value', 'Status']);
        for (const id of s.kpiConfigIds) {
          const k = data.kpiValues.get(id);
          if (k) rows.push([k.label, k.value, k.status]);
          else warnings.push(`KPI '${id}' not found.`);
        }
        sheets.push({ name: uniq(s.caption ?? 'KPIs'), rows });
        break;
      }
      case 'pivot-table': {
        const result = data.pivotResults.get(s.pivotConfigId);
        if (!result) { warnings.push(`Pivot '${s.pivotConfigId}' not found.`); break; }
        sheets.push({
          name: uniq(s.caption ?? s.pivotConfigId),
          rows: pivotToRows(result),
        });
        break;
      }
      case 'data-table': {
        const rows = data.dataRows.get(s.datasetId);
        if (!rows || rows.length === 0) { warnings.push(`Dataset '${s.datasetId}' not found or empty.`); break; }
        const limited = s.maxRows ? rows.slice(0, s.maxRows) : rows;
        sheets.push({
          name: uniq(s.caption ?? s.datasetId),
          rows: dataTableToRows(limited, s.columnIds),
        });
        break;
      }
      case 'page-break':
      case 'spacer':
      case 'chart':
        // Charts and layout sections have no Excel representation
        break;
    }
  }

  if (narrativeRows.length) {
    sheets.unshift({ name: uniq('Narrative'), rows: narrativeRows });
  }

  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  // Write as base64 directly to avoid the in-browser Blob path
  const data64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  return {
    reportId: config.id,
    format:   'excel',
    data:     data64,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${sanitizeFilename(config.name)}_${formatDateForFilename(new Date())}.xlsx`,
    generatedAt:  new Date(),
    durationMs:   performance.now() - start,
    sectionCount: sections.length,
    warnings,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pivotToRows(result: PivotResult): (string | number)[][] {
  const rows: (string | number)[][] = [];
  const header: (string | number)[] = [''];
  for (const c of result.flatColumns) header.push(c.label);
  rows.push(header);
  for (const r of result.rows) {
    const row: (string | number)[] = [Object.values(r.dimensions).join(' › ')];
    for (const c of result.flatColumns) {
      const cell = r.cells[c.key];
      row.push(cell?.value ?? cell?.formatted ?? '');
    }
    rows.push(row);
  }
  if (result.grandTotalRow) {
    const row: (string | number)[] = ['TOTAL'];
    for (const c of result.flatColumns) {
      const cell = result.grandTotalRow.cells[c.key];
      row.push(cell?.value ?? cell?.formatted ?? '');
    }
    rows.push(row);
  }
  return rows;
}

function dataTableToRows(rows: Row[], columnIds?: string[]): (string | number)[][] {
  if (rows.length === 0) return [['(empty)']];
  const cols = columnIds ?? Object.keys(rows[0]);
  const out: (string | number)[][] = [cols];
  for (const row of rows) {
    out.push(cols.map((c) => {
      const v = row[c];
      if (v == null) return '';
      if (typeof v === 'number' || typeof v === 'string') return v;
      return String(v);
    }));
  }
  return out;
}

/** Excel sheet names are limited to 31 chars and may not contain [ ] : * ? / \ */
function safeSheetName(name: string): string {
  let s = name.replace(/[[\]:*?/\\]/g, '_');
  if (s.length > 31) s = s.slice(0, 31);
  return s || 'Sheet';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\- ]/gi, '_').replace(/\s+/g, '_');
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().slice(0, 10);
}
