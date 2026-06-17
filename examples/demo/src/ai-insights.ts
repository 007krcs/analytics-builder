/**
 * AI Insights Service
 *
 * Three tiers:
 *
 *  FREE  — stats-only   Pure TypeScript statistics in the browser. No API key.
 *                       Z-score, Pearson r, linear regression, segment analysis.
 *
 *  FREE  — ollama       Local Ollama instance (http://localhost:11434).
 *                       100% free and private — model runs on your machine.
 *                       Install: https://ollama.com  →  `ollama pull llama3.2`
 *
 *  PAID  — anthropic    Anthropic Claude API (cloud).
 *                       Haiku ~$0.005/run · Sonnet ~$0.03 · Opus ~$0.05
 *
 * Prompt caching is applied to the stable system instructions so repeated
 * Anthropic runs re-read those tokens from cache (~90% cheaper).
 */

import Anthropic from '@anthropic-ai/sdk';
import type { InsightResult, Insight } from '@gridstorm/analytix-insight-engine';
import type { Dataset } from '@gridstorm/analytix-core';

// ─── Provider / model config ──────────────────────────────────────────────────

export type Provider = 'ollama' | 'anthropic';

export type AnthropicModel = 'claude-haiku-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-8';

export interface ProviderConfig {
  provider:        Provider;
  /** Ollama model tag, e.g. "llama3.2", "mistral", "phi3" */
  ollamaModel?:    string;
  /** Ollama base URL (default: http://localhost:11434) */
  ollamaBaseUrl?:  string;
  /** Anthropic model */
  anthropicModel?: AnthropicModel;
  /** Anthropic API key */
  apiKey?:         string;
}

export const ANTHROPIC_MODELS: Array<{ id: AnthropicModel; label: string; costNote: string }> = [
  { id: 'claude-haiku-4-5',  label: 'Haiku 4.5',  costNote: '~$0.005 / run — fastest & cheapest' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', costNote: '~$0.03 / run — balanced'            },
  { id: 'claude-opus-4-8',   label: 'Opus 4.8',   costNote: '~$0.05 / run — highest quality'     },
];

// Legacy export so existing code compiles
export type AIModel = AnthropicModel;
export const MODEL_OPTIONS = ANTHROPIC_MODELS;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIAnalysisOptions {
  config:   ProviderConfig;
  onChunk:  (text: string) => void;
  onDone:   (usage: TokenUsage) => void;
  onError:  (err: Error) => void;
  signal?:  AbortSignal;
}

export interface TokenUsage {
  inputTokens:      number;
  outputTokens:     number;
  cacheReadTokens:  number;
  cacheWriteTokens: number;
  estimatedCostUsd: number;
}

// ─── Pricing (per 1M tokens) ──────────────────────────────────────────────────

const PRICING: Record<AnthropicModel, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-haiku-4-5':  { input: 1.00,  output: 5.00,  cacheRead: 0.10, cacheWrite: 1.25 },
  'claude-sonnet-4-6': { input: 3.00,  output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-opus-4-8':   { input: 5.00,  output: 25.00, cacheRead: 0.50, cacheWrite: 6.25 },
};

function calcCost(model: AnthropicModel, usage: Anthropic.Usage): number {
  const p = PRICING[model];
  const M = 1_000_000;
  return (
    (usage.input_tokens                          / M) * p.input      +
    (usage.output_tokens                         / M) * p.output     +
    ((usage.cache_read_input_tokens   ?? 0)      / M) * p.cacheRead  +
    ((usage.cache_creation_input_tokens ?? 0)    / M) * p.cacheWrite
  );
}

// ─── Shared prompt helpers ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert business intelligence analyst and data scientist.
When given statistical findings from an analytics engine, produce a concise BI report with:
1. Executive Summary (3–5 sentences for a C-suite audience)
2. Key Risks & Opportunities (interpret critical/warning findings in plain business language)
3. Deeper Pattern Analysis (relationships between findings, the story the data tells)
4. Actionable Recommendations (3–5 prioritised next steps with expected impact)
5. Caveats & Data Quality Notes (limitations a decision-maker should know)
Use markdown formatting. Be professional and concise.`;

function formatInsight(i: Insight): string {
  return `• [${i.severity.toUpperCase()}] ${i.title}
  Type: ${i.type} | Cols: ${i.affectedColumns.join(', ')} | Confidence: ${Math.round(i.confidence * 100)}%
  ${i.description}`;
}

function buildUserMessage(dataset: Dataset, result: InsightResult): string {
  const cols     = dataset.columns.map((c) => `${c.displayName} (${c.type})`).join(', ');
  const critical = result.insights.filter((i) => i.severity === 'critical');
  const warning  = result.insights.filter((i) => i.severity === 'warning');
  const info     = result.insights.filter((i) => i.severity === 'info');

  return `## Dataset: ${dataset.name}
Rows: ${result.rowCount.toLocaleString()} | Columns: ${result.columnCount} — ${cols}

## Statistical Findings

### Critical (${critical.length})
${critical.map(formatInsight).join('\n\n') || 'None'}

### Warning (${warning.length})
${warning.map(formatInsight).join('\n\n') || 'None'}

### Informational (${info.length})
${info.map(formatInsight).join('\n\n') || 'None'}

Produce the BI report now.`;
}

// ─── Ollama provider ──────────────────────────────────────────────────────────

async function streamOllama(
  dataset:  Dataset,
  result:   InsightResult,
  config:   ProviderConfig,
  onChunk:  (text: string) => void,
  onDone:   (usage: TokenUsage) => void,
  onError:  (err: Error) => void,
  signal?:  AbortSignal,
) {
  const base  = (config.ollamaBaseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
  const model = config.ollamaModel ?? 'llama3.2';

  let res: Response;
  try {
    res = await fetch(`${base}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserMessage(dataset, result) },
        ],
      }),
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    onError(new Error(
      `Could not reach Ollama at ${base}. ` +
      `Make sure Ollama is running: https://ollama.com\n${msg}`
    ));
    return;
  }

  if (!res.ok) {
    onError(new Error(`Ollama error ${res.status}: ${await res.text()}`));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) { onError(new Error('No response body from Ollama')); return; }

  const decoder = new TextDecoder();
  let totalIn = 0, totalOut = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
          prompt_eval_count?: number;
          eval_count?: number;
        };
        if (obj.message?.content) onChunk(obj.message.content);
        if (obj.done) {
          totalIn  = obj.prompt_eval_count ?? 0;
          totalOut = obj.eval_count        ?? 0;
        }
      } catch { /* partial line */ }
    }
  }

  onDone({
    inputTokens:      totalIn,
    outputTokens:     totalOut,
    cacheReadTokens:  0,
    cacheWriteTokens: 0,
    estimatedCostUsd: 0, // Ollama is free
  });
}

// ─── Anthropic provider ───────────────────────────────────────────────────────

async function streamAnthropic(
  dataset:  Dataset,
  result:   InsightResult,
  config:   ProviderConfig,
  onChunk:  (text: string) => void,
  onDone:   (usage: TokenUsage) => void,
  onError:  (err: Error) => void,
  signal?:  AbortSignal,
) {
  const model  = config.anthropicModel ?? 'claude-haiku-4-5';
  const apiKey = config.apiKey ?? '';

  if (!apiKey.trim()) {
    onError(new Error('No Anthropic API key provided.'));
    return;
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const useThinking = model === 'claude-opus-4-8';

  try {
    const stream = client.messages.stream(
      {
        model,
        max_tokens: 2048,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cache_control: { type: 'ephemeral' } as any,
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(useThinking ? { thinking: { type: 'adaptive' } as any } : {}),
        messages: [{ role: 'user', content: buildUserMessage(dataset, result) }],
      },
      { signal },
    );

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onChunk(event.delta.text);
      }
    }

    const final = await stream.finalMessage();
    const usage = final.usage;

    onDone({
      inputTokens:      usage.input_tokens,
      outputTokens:     usage.output_tokens,
      cacheReadTokens:  usage.cache_read_input_tokens        ?? 0,
      cacheWriteTokens: usage.cache_creation_input_tokens    ?? 0,
      estimatedCostUsd: calcCost(model, usage),
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      onError(new Error(`Claude API error ${err.status}: ${err.message}`));
    } else if ((err as Error)?.name === 'AbortError') {
      // user cancelled — not an error
    } else {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function streamAIAnalysis(
  dataset: Dataset,
  result:  InsightResult,
  options: AIAnalysisOptions,
): Promise<void> {
  const { config, onChunk, onDone, onError, signal } = options;

  if (config.provider === 'ollama') {
    await streamOllama(dataset, result, config, onChunk, onDone, onError, signal);
  } else {
    await streamAnthropic(dataset, result, config, onChunk, onDone, onError, signal);
  }
}
