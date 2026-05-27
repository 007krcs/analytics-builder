import { describe, expect, it } from 'vitest';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import { generateReport, ReportBuilder } from './report-builder.js';

function buildSimpleConfig() {
  return new ReportBuilder('r1', 'Audit-Test-Report')
    .title('Hello PDF', 1)
    .text('Some **body** text spanning a paragraph that is long enough to wrap onto a second line when rendered into a narrow column at the default font size of eleven points or so.')
    .addChart('chart-xyz')
    .pageBreak()
    .title('Page Two', 2)
    .text('Second page body.')
    .build();
}

describe('generateReport — PDF', () => {
  it('produces real PDF bytes (starts with %PDF-)', async () => {
    const engine = new AnalyticsEngine();
    const out = await generateReport(buildSimpleConfig(), engine, 'pdf');
    expect(out.format).toBe('pdf');
    expect(out.mimeType).toBe('application/pdf');
    expect(out.filename.endsWith('.pdf')).toBe(true);
    const bytes = Buffer.from(out.data, 'base64');
    expect(bytes.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(bytes.subarray(-6).toString('utf8').includes('%%EOF')).toBe(true);
    expect(bytes.length).toBeGreaterThan(1000); // real PDFs are >>1 KB
  });

  it('still supports html format separately', async () => {
    const engine = new AnalyticsEngine();
    const out = await generateReport(buildSimpleConfig(), engine, 'html');
    expect(out.format).toBe('html');
    expect(out.mimeType).toBe('text/html');
    expect(out.filename.endsWith('.html')).toBe(true);
    const html = Buffer.from(out.data, 'base64').toString('utf8');
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
  });
});

describe('generateReport — Excel', () => {
  it('produces real .xlsx (ZIP header PK\\x03\\x04)', async () => {
    const engine = new AnalyticsEngine();
    const out = await generateReport(buildSimpleConfig(), engine, 'excel');
    expect(out.format).toBe('excel');
    expect(out.mimeType).toMatch(/spreadsheetml/);
    expect(out.filename.endsWith('.xlsx')).toBe(true);
    const bytes = Buffer.from(out.data, 'base64');
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4B); // 'K'
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
    expect(bytes.length).toBeGreaterThan(2000);
  });
});
