// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Correlation Detector — Pearson correlation between every pair of numeric columns.
 * Flags strong positive (r > 0.7) and inverse (r < -0.7) correlations.
 */

import type { Dataset, Row } from '@gridstorm/analytix-core';
import type { Insight } from '../types.js';

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 5) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += xs[i];
    sumY  += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] ** 2;
    sumY2 += ys[i] ** 2;
  }

  const num  = n * sumXY - sumX * sumY;
  const den  = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  return den === 0 ? 0 : num / den;
}

export function detectCorrelations(dataset: Dataset): Insight[] {
  const insights: Insight[] = [];

  const numericCols = dataset.columns.filter(
    (c) => c.aggregatable && ['number', 'integer', 'float', 'currency', 'percentage'].includes(c.type)
  );

  if (numericCols.length < 2) return insights;

  // Build aligned value arrays (only rows where both columns have valid values)
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const colA = numericCols[i];
      const colB = numericCols[j];

      const xs: number[] = [];
      const ys: number[] = [];

      for (const row of dataset.rows as Row[]) {
        const a = row[colA.id];
        const b = row[colB.id];
        if (typeof a === 'number' && typeof b === 'number' && !isNaN(a) && !isNaN(b)) {
          xs.push(a);
          ys.push(b);
        }
      }

      if (xs.length < 10) continue;

      const r = pearson(xs, ys);
      if (Math.abs(r) < 0.7) continue;

      const isInverse  = r < 0;
      const absR       = Math.abs(r);
      const confidence = (absR - 0.7) / 0.3; // 0 at 0.7, 1 at 1.0

      insights.push({
        id: `corr-${colA.id}-${colB.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: isInverse ? 'inverse-correlation' : 'strong-correlation',
        title: `${isInverse ? 'Inverse' : 'Strong'} correlation: ${colA.displayName} vs ${colB.displayName}`,
        description:
          `A ${isInverse ? 'strong inverse' : 'strong positive'} correlation (r=${r.toFixed(2)}) exists ` +
          `between ${colA.displayName} and ${colB.displayName} (n=${xs.length} paired observations). ` +
          `${isInverse
            ? `As ${colA.displayName} increases, ${colB.displayName} tends to decrease.`
            : `These two metrics move together — an increase in one predicts an increase in the other.`}`,
        severity: absR >= 0.9 ? 'warning' : 'info',
        affectedColumns: [colA.id, colB.id],
        confidence,
        chartSuggestion: 'scatter',
        metadata: {
          pearsonR: +r.toFixed(4),
          sampleSize: xs.length,
        },
      });
    }
  }

  return insights;
}
