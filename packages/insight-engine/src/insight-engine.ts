/**
 * InsightEngine — Main orchestrator.
 * Runs all detectors in parallel, ranks results, and generates narrative.
 */

import type { Dataset } from '@gridstorm/analytix-core';
import type { Insight, InsightConfig, InsightResult } from './types.js';
import { detectTrends }       from './detectors/trend-detector.js';
import { detectAnomalies }    from './detectors/anomaly-detector.js';
import { detectCorrelations } from './detectors/correlation-detector.js';
import { detectSegments }     from './detectors/segment-detector.js';
import { detectForecasts }    from './detectors/forecast-detector.js';
import { generateNarrative }  from './generators/narrative-generator.js';

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 3,
  warning:  2,
  info:     1,
};

/** Score an insight for ranking (confidence × severity weight) */
function score(insight: Insight): number {
  return insight.confidence * (SEVERITY_WEIGHT[insight.severity] ?? 1);
}

export class InsightEngine {
  /**
   * Analyse a dataset and return a ranked list of insights with a narrative.
   */
  async analyze(dataset: Dataset, config: InsightConfig = {}): Promise<InsightResult> {
    const {
      detectors     = ['trend', 'anomaly', 'correlation', 'segment', 'forecast'],
      maxInsights   = 20,
      minConfidence = 0.3,
      columnFilter,
    } = config;

    // Optionally narrow the dataset columns
    const workingDataset: Dataset = columnFilter
      ? { ...dataset, columns: dataset.columns.filter((c) => columnFilter.includes(c.id)) }
      : dataset;

    // Run all requested detectors in parallel
    const jobs: Promise<Insight[]>[] = [];

    if (detectors.includes('trend'))       jobs.push(Promise.resolve(detectTrends(workingDataset)));
    if (detectors.includes('anomaly'))     jobs.push(Promise.resolve(detectAnomalies(workingDataset)));
    if (detectors.includes('correlation')) jobs.push(Promise.resolve(detectCorrelations(workingDataset)));
    if (detectors.includes('segment'))     jobs.push(Promise.resolve(detectSegments(workingDataset)));
    if (detectors.includes('forecast'))    jobs.push(Promise.resolve(detectForecasts(workingDataset)));

    const results = await Promise.all(jobs);
    const allInsights = results.flat();

    // Filter by confidence, then rank
    const filtered = allInsights.filter((i) => i.confidence >= minConfidence);
    const ranked   = filtered.sort((a, b) => score(b) - score(a)).slice(0, maxInsights);

    // Generate executive summary
    const narrative = generateNarrative(ranked);

    return {
      insights:    ranked,
      narrative,
      analyzedAt:  new Date(),
      datasetId:   dataset.id,
      rowCount:    dataset.rows.length,
      columnCount: dataset.columns.length,
    };
  }

  /**
   * Convenience: just get the narrative from already-computed insights.
   */
  generateNarrative(insights: Insight[]): string {
    return generateNarrative(insights);
  }
}

/** Singleton for convenience */
export const insightEngine = new InsightEngine();
