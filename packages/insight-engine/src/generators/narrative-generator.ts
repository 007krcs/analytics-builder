// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * Narrative Generator — Template-based English generation with phrase variety.
 * Turns an array of Insight objects into a 2-3 sentence executive summary.
 */

import type { Insight } from '../types.js';

/** Pick a random item from an array deterministically (seeded by index) */
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/** Format a number as a compact string */
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

/** Generate a standalone narrative sentence for a single insight */
export function insightToSentence(insight: Insight, _index: number): string {
  const meta = insight.metadata ?? {};

  switch (insight.type) {
    case 'trend-up': {
      const phrases = [
        `${insight.affectedColumns[0]} is on a strong upward trajectory`,
        `Positive momentum detected in ${insight.affectedColumns[0]}`,
        `${insight.affectedColumns[0]} continues to climb`,
      ];
      return `${pick(phrases, _index)} (${String(meta.pctChange ?? '')}% change, R²=${String(meta.rSquared ?? '')}).`;
    }
    case 'trend-down': {
      return `${insight.affectedColumns[0]} is declining — down ${String(meta.pctChange ?? '')}% with an R² of ${String(meta.rSquared ?? '')}, suggesting a consistent downward pattern.`;
    }
    case 'trend-flat':
      return `${insight.affectedColumns[0]} remains relatively stable with no significant directional trend.`;

    case 'anomaly-spike': {
      const phrases = [
        `${Number(meta.count ?? 1)} anomalous spike${Number(meta.count ?? 1) > 1 ? 's' : ''} detected in ${insight.affectedColumns[0]} — outliers up to ${fmt(Number(meta.maxZScore ?? 0))}σ above average`,
        `Unusual high values in ${insight.affectedColumns[0]} warrant further investigation`,
      ];
      return `${pick(phrases, _index)}.`;
    }
    case 'anomaly-dip':
      return `${Number(meta.count ?? 1)} unusually low value${Number(meta.count ?? 1) > 1 ? 's' : ''} found in ${insight.affectedColumns[0]}, reaching ${fmt(Number(meta.maxZScore ?? 0))}σ below the mean.`;

    case 'strong-correlation':
      return `Strong positive correlation (r=${fmt(Number(meta.pearsonR ?? 0))}) between ${insight.affectedColumns[0]} and ${insight.affectedColumns[1]} — these metrics move in tandem.`;

    case 'inverse-correlation':
      return `${insight.affectedColumns[0]} and ${insight.affectedColumns[1]} move inversely (r=${fmt(Number(meta.pearsonR ?? 0))}), suggesting a trade-off relationship.`;

    case 'top-segment':
      return `"${String(meta.topSegment ?? '')}" leads as the top-performing ${insight.affectedColumns[0]} segment, contributing ${String(meta.topShare ?? '')}% of total ${insight.affectedColumns[1]}.`;

    case 'segment-dominance':
      return `Segment concentration risk: "${String(meta.dominantSegment ?? '')}" accounts for ${String(meta.sharePercent ?? '')}% of all ${insight.affectedColumns[1]}.`;

    case 'bottom-segment':
      return `"${String(meta.bottomSegment ?? '')}" is the lowest-performing ${insight.affectedColumns[0]} segment and may represent an underserved opportunity.`;

    case 'forecast-growth':
      return `${insight.affectedColumns[0]} is projected to grow ${String(meta.pctChange ?? '')}% over the next ${String(meta.periods ?? 3)} periods based on current trajectory.`;

    case 'forecast-decline':
      return `${insight.affectedColumns[0]} is forecast to decline ${String(meta.pctChange ?? '')}% — consider interventions if this trend continues.`;

    case 'missing-data':
      return `Missing values detected in ${insight.affectedColumns.join(', ')} — data completeness should be addressed before relying on these metrics.`;

    case 'data-quality':
      return `Data quality issues detected in ${insight.affectedColumns.join(', ')}.`;

    case 'record-high':
      return `${insight.affectedColumns[0]} has reached a record high value in the current dataset.`;

    case 'record-low':
      return `${insight.affectedColumns[0]} has reached a record low — monitor closely for potential issues.`;

    case 'period-over-period-change':
      return `Significant period-over-period change detected in ${insight.affectedColumns[0]}.`;

    default:
      return insight.description;
  }
}

/**
 * Generate a 2-3 sentence executive narrative from a ranked list of insights.
 */
export function generateNarrative(insights: Insight[]): string {
  if (insights.length === 0) {
    return 'No significant patterns detected in the current dataset. The data appears uniform with no notable trends, anomalies, or correlations. Consider expanding the dataset size or date range for a more comprehensive analysis.';
  }

  // Take top 3 most important insights
  const top = insights.slice(0, 3);

  const sentences: string[] = [];

  // Sentence 1: lead with the highest-confidence insight
  const lead = top[0];
  const openings = [
    `The analysis of ${lead.affectedColumns[0]} reveals`,
    `Key finding:`,
    `Most significant pattern:`,
    `Notable signal:`,
  ];
  sentences.push(`${pick(openings, 0)} ${insightToSentence(lead, 0)}`);

  // Sentence 2: second insight if available
  if (top[1]) {
    const connectors = ['Additionally,', 'Furthermore,', 'Also notable:', 'Secondary finding:'];
    sentences.push(`${pick(connectors, 1)} ${insightToSentence(top[1], 1)}`);
  }

  // Sentence 3: third insight or closing summary
  if (top[2]) {
    sentences.push(insightToSentence(top[2], 2));
  } else {
    const criticalCount = insights.filter((i) => i.severity === 'critical').length;
    const warningCount  = insights.filter((i) => i.severity === 'warning').length;
    if (criticalCount > 0) {
      sentences.push(`Overall, ${criticalCount} critical signal${criticalCount > 1 ? 's' : ''} and ${warningCount} warning${warningCount > 1 ? 's' : ''} require immediate attention.`);
    } else {
      sentences.push(`Overall, ${insights.length} pattern${insights.length > 1 ? 's' : ''} identified — the dataset shows ${warningCount > 0 ? 'some areas requiring attention' : 'healthy metrics across all dimensions'}.`);
    }
  }

  return sentences.join(' ');
}
