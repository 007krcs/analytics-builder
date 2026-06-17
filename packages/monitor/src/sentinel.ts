/**
 * Sentinel — autonomous streaming monitor.
 *
 * Feed it batches of incoming rows (`push`) and it maintains a sliding window
 * per watched column, detects anomalies online (spikes, drops, flatlines,
 * threshold breaches, new categories), explains each in plain English, filters
 * by severity, optionally enriches the explanation via an LLM, and posts each
 * finding to a webhook (Slack-compatible). Fully headless and injectable, so it
 * tests deterministically and runs anywhere.
 */

import type { Row } from '@gridstorm/analytix-core';

export type Severity = 'info' | 'warning' | 'critical';
const SEV_RANK: Record<Severity, number> = { info: 1, warning: 2, critical: 3 };

export type FindingType = 'spike' | 'drop' | 'flatline' | 'threshold' | 'new-category';

export interface Finding {
  id: string;
  detectedAt: number;
  severity: Severity;
  type: FindingType;
  column: string;
  value: number | string;
  baseline?: number;
  zScore?: number;
  title: string;
  description: string;
}

export interface ThresholdRule {
  column: string;
  min?: number;
  max?: number;
  /** Severity to emit on breach (default 'warning'). */
  severity?: Severity;
}

export interface MonitorConfig {
  /** Numeric columns to watch. Auto-detected from the first rows if omitted. */
  numericColumns?: string[];
  /** Categorical columns to watch for never-seen values (needs detectNewCategories). */
  categoricalColumns?: string[];
  /** Sliding window length used as the anomaly baseline (default 30). */
  windowSize?: number;
  /** Minimum samples before anomaly checks begin (default 8). */
  minSamples?: number;
  /** Absolute z-score threshold for spike/drop (default 3). */
  zThreshold?: number;
  /** Minimum severity to emit (default 'info'). */
  alertLevel?: Severity;
  /** Static threshold rules. */
  thresholds?: ThresholdRule[];
  /** Emit a finding when a categorical column shows a value not seen recently. */
  detectNewCategories?: boolean;
  /** Called for every emitted finding (after enrichment). */
  onFinding?: (finding: Finding) => void | Promise<void>;
  /** Webhook to POST findings to (Slack-compatible `{ text, ... }`). */
  webhookUrl?: string;
  /** Injectable fetch (for the webhook), for testing. */
  fetchImpl?: typeof fetch;
  /** Optional async enricher (e.g. an LLM) returning a richer description. */
  enrich?: (finding: Finding) => Promise<string>;
  /** Time source (default Date.now). */
  now?: () => number;
  /** Id generator (default sequential). */
  idGen?: () => string;
}

const EPS = 1e-9;

export class Sentinel {
  private readonly windows = new Map<string, number[]>();
  private readonly seenCats = new Map<string, Set<string>>();
  private readonly flatFlagged = new Set<string>();
  private readonly _findings: Finding[] = [];
  private seq = 0;

  private readonly windowSize: number;
  private readonly minSamples: number;
  private readonly zThreshold: number;
  private readonly alertLevel: Severity;
  private readonly now: () => number;
  private readonly idGen: () => string;
  private readonly fetchImpl?: typeof fetch;

  constructor(private readonly config: MonitorConfig = {}) {
    this.windowSize = config.windowSize ?? 30;
    this.minSamples = config.minSamples ?? 8;
    this.zThreshold = config.zThreshold ?? 3;
    this.alertLevel = config.alertLevel ?? 'info';
    this.now = config.now ?? (() => Date.now());
    this.idGen = config.idGen ?? (() => `finding-${++this.seq}`);
    this.fetchImpl = config.fetchImpl ?? (globalThis as { fetch?: typeof fetch }).fetch;
  }

  /** All findings emitted so far (most recent last). */
  get findings(): readonly Finding[] { return this._findings; }

  /** Clear windows and history. */
  reset(): void {
    this.windows.clear();
    this.seenCats.clear();
    this.flatFlagged.clear();
    this._findings.length = 0;
  }

  /**
   * Feed a batch of new rows. Returns the findings emitted for THIS batch
   * (already filtered by alertLevel, enriched, and dispatched to onFinding +
   * webhook).
   */
  async push(rows: Row[]): Promise<Finding[]> {
    const numericCols = this.config.numericColumns ?? this.inferNumericColumns(rows);
    const catCols = this.config.detectNewCategories ? (this.config.categoricalColumns ?? []) : [];
    const candidates: Finding[] = [];

    for (const row of rows) {
      // ── Numeric anomalies ──
      for (const colName of numericCols) {
        const raw = row[colName];
        const v = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isNaN(v)) continue;

        // Static threshold rules (independent of the window).
        for (const rule of this.config.thresholds ?? []) {
          if (rule.column !== colName) continue;
          if (rule.max !== undefined && v > rule.max) {
            candidates.push(this.make('threshold', rule.severity ?? 'warning', colName, v, {
              title: `${colName} above threshold`,
              description: `${colName} = ${fmt(v)} breached the configured maximum of ${fmt(rule.max)}.`,
            }));
          }
          if (rule.min !== undefined && v < rule.min) {
            candidates.push(this.make('threshold', rule.severity ?? 'warning', colName, v, {
              title: `${colName} below threshold`,
              description: `${colName} = ${fmt(v)} fell under the configured minimum of ${fmt(rule.min)}.`,
            }));
          }
        }

        const win = this.windows.get(colName) ?? [];
        if (win.length >= this.minSamples) {
          const { mean, std } = stats(win);
          if (std > EPS) {
            const z = (v - mean) / std;
            if (Math.abs(z) >= this.zThreshold) {
              const up = z > 0;
              candidates.push(this.make(up ? 'spike' : 'drop', severityFromZ(Math.abs(z)), colName, v, {
                baseline: round(mean), zScore: round(z),
                title: `${colName} ${up ? 'spike' : 'drop'}`,
                description: `${colName} ${up ? 'spiked' : 'fell'} to ${fmt(v)} — ${Math.abs(z).toFixed(1)}σ ${up ? 'above' : 'below'} the recent average of ${fmt(round(mean))}.`,
              }));
            }
          } else if (Math.abs(v - mean) > EPS) {
            // The window was flat, then the value moved — notable change.
            const up = v > mean;
            candidates.push(this.make(up ? 'spike' : 'drop', 'warning', colName, v, {
              baseline: round(mean),
              title: `${colName} ${up ? 'jumped' : 'dropped'} after a flat period`,
              description: `${colName} ${up ? 'jumped up to' : 'dropped to'} ${fmt(v)} after holding flat at ${fmt(round(mean))}.`,
            }));
          }
        }

        // Flatline: a full window with no variance (only flag once until it moves).
        if (win.length >= this.windowSize) {
          const { std } = stats(win);
          if (std <= EPS && !this.flatFlagged.has(colName)) {
            this.flatFlagged.add(colName);
            candidates.push(this.make('flatline', 'info', colName, win[win.length - 1], {
              title: `${colName} flatlined`,
              description: `${colName} has been flat at ${fmt(win[win.length - 1])} for ${this.windowSize} readings — the feed may be stale.`,
            }));
          } else if (std > EPS) {
            this.flatFlagged.delete(colName);
          }
        }

        win.push(v);
        if (win.length > this.windowSize) win.shift();
        this.windows.set(colName, win);
      }

      // ── New categorical values ──
      for (const colName of catCols) {
        const raw = row[colName];
        if (raw == null) continue;
        const val = String(raw);
        const seen = this.seenCats.get(colName) ?? new Set<string>();
        const isWarm = seen.size > 0;
        if (isWarm && !seen.has(val)) {
          candidates.push(this.make('new-category', 'info', colName, val, {
            title: `New ${colName} value`,
            description: `A new ${colName} value "${val}" appeared — not seen earlier in the stream.`,
          }));
        }
        seen.add(val);
        this.seenCats.set(colName, seen);
      }
    }

    // ── Filter by severity, enrich, dispatch ──
    const emitted: Finding[] = [];
    for (const f of candidates) {
      if (SEV_RANK[f.severity] < SEV_RANK[this.alertLevel]) continue;
      if (this.config.enrich) {
        try { f.description = await this.config.enrich(f); } catch { /* keep heuristic text */ }
      }
      this._findings.push(f);
      emitted.push(f);
      if (this.config.onFinding) {
        try { await this.config.onFinding(f); } catch { /* swallow listener errors */ }
      }
      if (this.config.webhookUrl && this.fetchImpl) {
        await this.postWebhook(f).catch(() => { /* webhook failure must not stop monitoring */ });
      }
    }
    return emitted;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private make(
    type: FindingType, severity: Severity, column: string, value: number | string,
    extra: { title: string; description: string; baseline?: number; zScore?: number }
  ): Finding {
    return {
      id: this.idGen(),
      detectedAt: this.now(),
      severity, type, column, value,
      baseline: extra.baseline,
      zScore: extra.zScore,
      title: extra.title,
      description: extra.description,
    };
  }

  private async postWebhook(f: Finding): Promise<void> {
    const text = `[${f.severity.toUpperCase()}] ${f.title} — ${f.description}`;
    await this.fetchImpl!(this.config.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, finding: f }),
    });
  }

  private inferNumericColumns(rows: Row[]): string[] {
    const cols = new Set<string>();
    for (const r of rows.slice(0, 20)) {
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === 'number' && !Number.isNaN(v)) cols.add(k);
      }
    }
    return Array.from(cols);
  }
}

// ── small stats helpers ──

function stats(xs: number[]): { mean: number; std: number } {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

function severityFromZ(z: number): Severity {
  if (z >= 5) return 'critical';
  if (z >= 4) return 'warning';
  return 'info';
}

const round = (n: number) => Math.round(n * 100) / 100;
const fmt = (v: number | string) =>
  typeof v === 'number' ? (Math.abs(v) >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(round(v))) : v;
