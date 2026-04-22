// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Anomaly Detector — Z-score + IQR dual method.
 * Flags any point with |z| > 2.5 OR outside 3×IQR as an anomaly.
 */

import type { Dataset, Row } from '@gridstorm/analytix-core';
import type { Insight } from '../types.js';

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[], mu: number): number {
  const variance = values.reduce((s, v) => s + (v - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function quartiles(sorted: number[]): { q1: number; q3: number } {
  const mid  = Math.floor(sorted.length / 2);
  const q1   = sorted[Math.floor(mid / 2)];
  const q3   = sorted[Math.ceil((sorted.length + mid) / 2)];
  return { q1: q1 ?? sorted[0], q3: q3 ?? sorted[sorted.length - 1] };
}

interface AnomalyPoint {
  rowIndex: number;
  value: number;
  zScore: number;
  row: Row;
}

export function detectAnomalies(dataset: Dataset): Insight[] {
  const insights: Insight[] = [];

  const numericCols = dataset.columns.filter(
    (c) => c.aggregatable && ['number', 'integer', 'float', 'currency', 'percentage'].includes(c.type)
  );

  for (const col of numericCols) {
    const indexed: Array<{ idx: number; val: number; row: Row }> = [];
    dataset.rows.forEach((row: Row, idx: number) => {
      const v = row[col.id];
      if (typeof v === 'number' && !isNaN(v)) {
        indexed.push({ idx, val: v, row });
      }
    });

    if (indexed.length < 10) continue;

    const values = indexed.map((e) => e.val);
    const mu     = mean(values);
    const sd     = stdDev(values, mu);
    if (sd === 0) continue;

    const sorted = [...values].sort((a, b) => a - b);
    const { q1, q3 } = quartiles(sorted);
    const iqr     = q3 - q1;
    const lowerIQR = q1 - 3 * iqr;
    const upperIQR = q3 + 3 * iqr;

    const spikes: AnomalyPoint[] = [];
    const dips:   AnomalyPoint[] = [];

    for (const entry of indexed) {
      const z = (entry.val - mu) / sd;
      const outsideIQR = entry.val < lowerIQR || entry.val > upperIQR;
      if (Math.abs(z) > 2.5 || outsideIQR) {
        const point: AnomalyPoint = { rowIndex: entry.idx, value: entry.val, zScore: z, row: entry.row };
        if (z > 0) spikes.push(point);
        else        dips.push(point);
      }
    }

    if (spikes.length > 0) {
      const rowNums = spikes.slice(0, 5).map((p) => p.rowIndex + 1).join(', ');
      const maxZ    = Math.max(...spikes.map((p) => p.zScore));
      const confidence = Math.min(1, maxZ / 5);
      insights.push({
        id: `anomaly-spike-${col.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'anomaly-spike',
        title: `${spikes.length} anomalous spike${spikes.length > 1 ? 's' : ''} in ${col.displayName}`,
        description:
          `${spikes.length} unusually high value${spikes.length > 1 ? 's' : ''} detected in ${col.displayName} ` +
          `(rows ${rowNums}${spikes.length > 5 ? '…' : ''}) — these are statistical outliers ` +
          `exceeding ${maxZ.toFixed(1)}σ above the mean (${mu.toFixed(2)}).`,
        severity: maxZ > 4 ? 'critical' : 'warning',
        affectedColumns: [col.id],
        confidence,
        chartSuggestion: 'scatter',
        metadata: {
          mean: +mu.toFixed(4),
          stdDev: +sd.toFixed(4),
          maxZScore: +maxZ.toFixed(2),
          count: spikes.length,
          rows: spikes.slice(0, 10).map((p) => p.row),
        },
      });
    }

    if (dips.length > 0) {
      const rowNums = dips.slice(0, 5).map((p) => p.rowIndex + 1).join(', ');
      const maxAbsZ = Math.max(...dips.map((p) => Math.abs(p.zScore)));
      const confidence = Math.min(1, maxAbsZ / 5);
      insights.push({
        id: `anomaly-dip-${col.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'anomaly-dip',
        title: `${dips.length} anomalous dip${dips.length > 1 ? 's' : ''} in ${col.displayName}`,
        description:
          `${dips.length} unusually low value${dips.length > 1 ? 's' : ''} detected in ${col.displayName} ` +
          `(rows ${rowNums}${dips.length > 5 ? '…' : ''}) — values fall more than ` +
          `${maxAbsZ.toFixed(1)}σ below the mean (${mu.toFixed(2)}).`,
        severity: maxAbsZ > 4 ? 'critical' : 'warning',
        affectedColumns: [col.id],
        confidence,
        chartSuggestion: 'scatter',
        metadata: {
          mean: +mu.toFixed(4),
          stdDev: +sd.toFixed(4),
          maxZScore: +maxAbsZ.toFixed(2),
          count: dips.length,
          rows: dips.slice(0, 10).map((p) => p.row),
        },
      });
    }
  }

  return insights;
}
