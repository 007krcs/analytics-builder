/**
 * Trend Detector — Least-squares linear regression on numeric columns.
 * Returns trend insights with slope direction and R² strength.
 */

import type { Dataset, Row } from '@analytix/core';
import type { Insight, TrendStrength } from '../types.js';

/** Compute least-squares linear regression for y-values (x = 0,1,...,n-1) */
function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = values.length;
  if (n < 3) return { slope: 0, intercept: values[0] ?? 0, rSquared: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += i;
    sumY  += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² = 1 - SS_res / SS_tot
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTot += (values[i] - meanY) ** 2;
    ssRes += (values[i] - predicted) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}

function strengthFromR2(r2: number): TrendStrength {
  if (r2 >= 0.7) return 'strong';
  if (r2 >= 0.4) return 'moderate';
  return 'weak';
}

export function detectTrends(dataset: Dataset): Insight[] {
  const insights: Insight[] = [];

  const numericCols = dataset.columns.filter(
    (c) => c.aggregatable && ['number', 'integer', 'float', 'currency', 'percentage'].includes(c.type)
  );

  for (const col of numericCols) {
    const values: number[] = dataset.rows
      .map((r: Row) => r[col.id])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (values.length < 5) continue;

    const { slope, rSquared } = linearRegression(values);
    if (rSquared < 0.2) continue; // not a meaningful trend

    const strength = strengthFromR2(rSquared);
    const first    = values[0];
    const last     = values[values.length - 1];
    const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    const direction = slope > 0 ? 'up' : 'down';
    const type      = slope > 0 ? 'trend-up' as const : 'trend-down' as const;

    if (Math.abs(pctChange) < 2) continue;

    const sign = pctChange >= 0 ? '+' : '';
    insights.push({
      id: `trend-${col.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      title: `${col.displayName} trending ${direction} (${sign}${pctChange.toFixed(1)}%)`,
      description:
        `${col.displayName} shows a ${strength} ${direction}ward trend over the analysis period ` +
        `(${sign}${pctChange.toFixed(1)}% change, R²=${rSquared.toFixed(2)}). ` +
        `The regression slope is ${slope > 0 ? 'positive' : 'negative'}, indicating a ` +
        `${strength} directional signal.`,
      severity: strength === 'strong' ? 'warning' : 'info',
      affectedColumns: [col.id],
      confidence: rSquared,
      chartSuggestion: 'line',
      metadata: {
        slope: +slope.toFixed(4),
        rSquared: +rSquared.toFixed(4),
        pctChange: +pctChange.toFixed(2),
        strength,
      },
    });
  }

  return insights;
}
