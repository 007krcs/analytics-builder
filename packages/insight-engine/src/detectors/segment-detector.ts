// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Segment Detector — Top/bottom N segments by aggregated value.
 * Groups by dimensional columns and aggregates numeric columns.
 */

import type { Dataset, Row } from '@gridstorm/analytix-core';
import type { Insight } from '../types.js';

/** Display label for a column — prefers displayName but falls back to id. */
const label = (c: { displayName?: string; id: string }): string => c.displayName ?? c.id;

export interface DetectSegmentsOptions {
  /** Maximum number of dimension columns to inspect (default 2). */
  maxDims?: number;
  /** Maximum number of numeric columns to inspect (default 2). */
  maxNums?: number;
  /** Optional sink that receives a warning when extra columns are dropped. */
  onWarning?: (msg: string) => void;
}

export function detectSegments(
  dataset: Dataset,
  options: DetectSegmentsOptions = {}
): Insight[] {
  const { maxDims = 2, maxNums = 2, onWarning } = options;
  const insights: Insight[] = [];

  const dimCols = dataset.columns.filter((c) => c.dimensional && c.type === 'string');
  const numCols = dataset.columns.filter(
    (c) => c.aggregatable && ['number', 'integer', 'float', 'currency'].includes(c.type)
  );

  if (dimCols.length === 0 || numCols.length === 0) return insights;

  // Cap to avoid Cartesian explosion when a dataset has many dim/num columns.
  // The caps are configurable; surface a warning if columns were dropped.
  const useDims = dimCols.slice(0, maxDims);
  const useNums = numCols.slice(0, maxNums);

  if (onWarning) {
    if (dimCols.length > maxDims) {
      onWarning(
        `Segment detector inspected ${maxDims} of ${dimCols.length} dimension columns; ` +
        `the rest were skipped. Raise maxDims to inspect more.`
      );
    }
    if (numCols.length > maxNums) {
      onWarning(
        `Segment detector inspected ${maxNums} of ${numCols.length} numeric columns; ` +
        `the rest were skipped. Raise maxNums to inspect more.`
      );
    }
  }

  for (const dim of useDims) {
    for (const num of useNums) {
      // Aggregate: sum by dimension value
      const segMap = new Map<string, number>();
      let   total  = 0;

      for (const row of dataset.rows as Row[]) {
        const k = String(row[dim.id] ?? '(blank)');
        const v = row[num.id];
        if (typeof v === 'number' && !isNaN(v)) {
          segMap.set(k, (segMap.get(k) ?? 0) + v);
          total += v;
        }
      }

      if (segMap.size < 3) continue;

      const sorted = Array.from(segMap.entries()).sort((a, b) => b[1] - a[1]);
      const topN   = sorted.slice(0, 3);
      const botN   = sorted.slice(-3).reverse();

      const topTotal   = topN.reduce((s, e) => s + e[1], 0);
      const topShare   = total > 0 ? (topTotal / total) * 100 : 0;
      const topLabel   = topN[0][0];
      const topValue   = topN[0][1];

      // Top segment insight
      insights.push({
        id: `seg-top-${dim.id}-${num.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'top-segment',
        title: `Top ${label(dim)}: ${topLabel}`,
        description:
          `"${topLabel}" leads all ${label(dim)} segments in ${label(num)} ` +
          `with ${topValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ` +
          `(${(total > 0 ? topValue / total * 100 : 0).toFixed(1)}% of total). ` +
          `The top 3 segments together account for ${topShare.toFixed(1)}% of total ${label(num)}.`,
        severity: topShare > 80 ? 'warning' : 'info',
        affectedColumns: [dim.id, num.id],
        confidence: 0.85,
        chartSuggestion: 'bar',
        metadata: {
          topSegment: topLabel,
          topValue: +topValue.toFixed(2),
          topShare: +topShare.toFixed(2),
          totalSegments: segMap.size,
        },
      });

      // Segment dominance: if top 1 segment > 50% that's notable
      if (topShare > 50 && total > 0 && (topValue / total) > 0.5) {
        insights.push({
          id: `seg-dom-${dim.id}-${num.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: 'segment-dominance',
          title: `${topLabel} dominates ${label(dim)} (${(topValue / total * 100).toFixed(0)}%)`,
          description:
            `A single segment "${topLabel}" accounts for ${(topValue / total * 100).toFixed(1)}% ` +
            `of all ${label(num)} across ${segMap.size} ${label(dim)} segments. ` +
            `This concentration may indicate dependency risk or an opportunity to expand other segments.`,
          severity: (topValue / total) > 0.7 ? 'critical' : 'warning',
          affectedColumns: [dim.id, num.id],
          confidence: 0.9,
          chartSuggestion: 'pie',
          metadata: {
            dominantSegment: topLabel,
            sharePercent: +(topValue / total * 100).toFixed(2),
          },
        });
      }

      // Bottom segment insight
      const botLabel = botN[0][0];
      const botValue = botN[0][1];
      insights.push({
        id: `seg-bot-${dim.id}-${num.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'bottom-segment',
        title: `Lowest ${label(dim)}: ${botLabel}`,
        description:
          `"${botLabel}" has the lowest ${label(num)} among all ${label(dim)} segments ` +
          `(${botValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}, ` +
          `only ${(total > 0 ? botValue / total * 100 : 0).toFixed(1)}% of total). ` +
          `Consider investigating whether this represents underperformance or a smaller market.`,
        severity: 'info',
        affectedColumns: [dim.id, num.id],
        confidence: 0.75,
        chartSuggestion: 'bar',
        metadata: {
          bottomSegment: botLabel,
          bottomValue: +botValue.toFixed(2),
        },
      });
    }
  }

  return insights;
}
