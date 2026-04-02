/**
 * Forecast Detector — Simple linear extrapolation for the next N periods.
 * Uses the same least-squares regression as the trend detector.
 */

import type { Dataset, Row } from '@gridstorm/analytix-core';
import type { Insight } from '../types.js';

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX  += i;
    sumY  += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom    = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function detectForecasts(dataset: Dataset): Insight[] {
  const insights: Insight[] = [];
  const FORECAST_PERIODS   = 3;

  const numericCols = dataset.columns.filter(
    (c) => c.aggregatable && ['number', 'integer', 'float', 'currency', 'percentage'].includes(c.type)
  );

  for (const col of numericCols) {
    const values: number[] = dataset.rows
      .map((r: Row) => r[col.id])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (values.length < 6) continue;

    const { slope, intercept } = linearRegression(values);
    const n = values.length;

    // Only forecast if there is a discernible slope
    const meanVal = values.reduce((s, v) => s + v, 0) / n;
    const relativeSlopeStrength = meanVal !== 0 ? Math.abs(slope) / Math.abs(meanVal) : 0;
    if (relativeSlopeStrength < 0.005) continue; // < 0.5% per period — not worth forecasting

    // Build forecasted values
    const forecasted: number[] = [];
    for (let p = 0; p < FORECAST_PERIODS; p++) {
      forecasted.push(slope * (n + p) + intercept);
    }

    const lastActual = values[n - 1];
    const lastForecast = forecasted[FORECAST_PERIODS - 1];
    const pctChange = lastActual !== 0 ? ((lastForecast - lastActual) / Math.abs(lastActual)) * 100 : 0;
    const isGrowth = pctChange >= 0;
    const sign     = isGrowth ? '+' : '';

    insights.push({
      id: `forecast-${col.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: isGrowth ? 'forecast-growth' : 'forecast-decline',
      title: `Forecast: ${col.displayName} projected to ${isGrowth ? 'grow' : 'decline'} ${sign}${pctChange.toFixed(1)}%`,
      description:
        `Based on current trajectory, ${col.displayName} is projected to ` +
        `${isGrowth ? 'grow' : 'decline'} by ${sign}${pctChange.toFixed(1)}% over the next ` +
        `${FORECAST_PERIODS} periods (from ${lastActual.toLocaleString(undefined, { maximumFractionDigits: 1 })} ` +
        `to ${lastForecast.toLocaleString(undefined, { maximumFractionDigits: 1 })}). ` +
        `This extrapolation assumes the current linear trend continues unchanged.`,
      severity: Math.abs(pctChange) > 20 ? 'warning' : 'info',
      affectedColumns: [col.id],
      confidence: Math.min(0.8, relativeSlopeStrength * 10),
      chartSuggestion: 'area',
      metadata: {
        slope: +slope.toFixed(4),
        lastActual: +lastActual.toFixed(2),
        forecastedValues: forecasted.map((v) => +v.toFixed(2)).join(','),
        pctChange: +pctChange.toFixed(2),
        periods: FORECAST_PERIODS,
      },
    });
  }

  return insights;
}
