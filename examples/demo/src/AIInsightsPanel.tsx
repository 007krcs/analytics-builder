/**
 * AIInsightsPanel
 *
 * Renders both the statistical InsightResult (zero-dependency, always available)
 * and optionally upgrades to an AI-powered BI report.
 *
 * Provider options:
 *  FREE  — Ollama (local)   No API key. Runs llama3.2 on your machine.
 *  PAID  — Anthropic Claude Cloud API. Haiku ~$0.005/run · Sonnet ~$0.03.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { InsightEngine } from '@gridstorm/analytix-insight-engine';
import type { InsightResult, Insight } from '@gridstorm/analytix-insight-engine';
import type { Dataset } from '@gridstorm/analytix-core';
import {
  streamAIAnalysis,
  ANTHROPIC_MODELS,
} from './ai-insights.js';
import type { AnthropicModel, Provider, ProviderConfig, TokenUsage } from './ai-insights.js';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AIInsightsPanelProps {
  dataset: Dataset;
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Insight['severity'] }) {
  const cls =
    severity === 'critical' ? 'ai-badge ai-badge--critical'
    : severity === 'warning' ? 'ai-badge ai-badge--warning'
    : 'ai-badge ai-badge--info';
  return <span className={cls}>{severity}</span>;
}

// ─── Single insight card ──────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`insight-card insight-card--${insight.severity}`}>
      <div className="insight-card-header">
        <span className="insight-type-badge">{insight.type}</span>
        <SeverityBadge severity={insight.severity} />
        {insight.chartSuggestion && (
          <span className="insight-chart-hint">📊 {insight.chartSuggestion}</span>
        )}
      </div>
      <h4 className="insight-title">{insight.title}</h4>
      <p className="insight-description">{insight.description}</p>
      <div className="insight-meta">
        <span>Columns: {insight.affectedColumns.join(', ')}</span>
        <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
      </div>
    </div>
  );
}

// ─── Simple markdown renderer (bold/headers only — no external deps) ──────────

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="ai-markdown">
      {lines.map((line, i) => {
        if (line.startsWith('## '))  return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
        if (line.startsWith('#### ')) return <h4 key={i}>{line.slice(5)}</h4>;
        if (line.startsWith('**') && line.endsWith('**') && line.length > 4)
          return <p key={i}><strong>{line.slice(2, -2)}</strong></p>;
        if (line.startsWith('- ') || line.startsWith('• '))
          return <li key={i}>{renderInline(line.slice(2))}</li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part,
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIInsightsPanel({ dataset }: AIInsightsPanelProps) {
  // Statistical results
  const [statResult,   setStatResult]   = useState<InsightResult | null>(null);
  const [statLoading,  setStatLoading]  = useState(false);
  const [filterTab,    setFilterTab]    = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  // Provider selection
  const [provider, setProvider] = useState<Provider>(
    () => (localStorage.getItem('analytix_provider') as Provider | null) ?? 'ollama'
  );

  // Ollama config
  const [ollamaModel,   setOllamaModel]   = useState(() => localStorage.getItem('analytix_ollama_model') ?? 'llama3.2');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(() => localStorage.getItem('analytix_ollama_url')   ?? 'http://localhost:11434');

  // Anthropic config
  const [apiKey,  setApiKey]  = useState(() => localStorage.getItem('analytix_api_key') ?? '');
  const [showKey, setShowKey] = useState(false);
  const [model,   setModel]   = useState<AnthropicModel>(
    () => (localStorage.getItem('analytix_model') as AnthropicModel | null) ?? 'claude-haiku-4-5'
  );

  // AI output state
  const [aiText,    setAiText]    = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState<string | null>(null);
  const [aiDone,    setAiDone]    = useState(false);
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // ── Run statistical analysis on mount / dataset change ──────────────────────

  useEffect(() => {
    if (!dataset) return;
    setStatLoading(true);
    setStatResult(null);

    const engine = new InsightEngine();
    engine.analyze(dataset).then((result) => {
      setStatResult(result);
      setStatLoading(false);
    });
  }, [dataset]);

  // ── Filtered insights ────────────────────────────────────────────────────────

  const visibleInsights = statResult
    ? filterTab === 'all'
      ? statResult.insights
      : statResult.insights.filter((i) => i.severity === filterTab)
    : [];

  const counts = statResult
    ? {
        all:      statResult.insights.length,
        critical: statResult.insights.filter((i) => i.severity === 'critical').length,
        warning:  statResult.insights.filter((i) => i.severity === 'warning').length,
        info:     statResult.insights.filter((i) => i.severity === 'info').length,
      }
    : { all: 0, critical: 0, warning: 0, info: 0 };

  // ── Persist preferences ──────────────────────────────────────────────────────

  const handleProviderChange = useCallback((p: Provider) => {
    setProvider(p);
    localStorage.setItem('analytix_provider', p);
    setAiText('');
    setAiError(null);
    setAiDone(false);
    setLastUsage(null);
  }, []);

  const handleKeyChange = useCallback((val: string) => {
    setApiKey(val);
    if (val.trim()) localStorage.setItem('analytix_api_key', val.trim());
  }, []);

  const handleModelChange = useCallback((m: AnthropicModel) => {
    setModel(m);
    localStorage.setItem('analytix_model', m);
  }, []);

  const handleOllamaModelChange = useCallback((val: string) => {
    setOllamaModel(val);
    localStorage.setItem('analytix_ollama_model', val);
  }, []);

  const handleOllamaUrlChange = useCallback((val: string) => {
    setOllamaBaseUrl(val);
    localStorage.setItem('analytix_ollama_url', val);
  }, []);

  // ── Start AI analysis ────────────────────────────────────────────────────────

  const canAnalyse = statResult && (provider === 'ollama' || apiKey.trim());

  const buildConfig = (): ProviderConfig => {
    if (provider === 'ollama') {
      return { provider: 'ollama', ollamaModel, ollamaBaseUrl };
    }
    return { provider: 'anthropic', anthropicModel: model, apiKey };
  };

  const handleAnalyse = useCallback(() => {
    if (!statResult) return;
    if (provider === 'anthropic' && !apiKey.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAiText('');
    setAiError(null);
    setAiDone(false);
    setAiLoading(true);
    setLastUsage(null);

    streamAIAnalysis(dataset, statResult, {
      config: buildConfig(),
      signal: controller.signal,
      onChunk: (chunk) => {
        setAiText((prev) => prev + chunk);
        requestAnimationFrame(() => {
          if (aiScrollRef.current) {
            aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
          }
        });
      },
      onDone: (usage) => {
        setAiLoading(false);
        setAiDone(true);
        setLastUsage(usage);
      },
      onError: (err) => {
        setAiLoading(false);
        setAiError(err.message);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, ollamaModel, ollamaBaseUrl, apiKey, model, dataset, statResult]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setAiLoading(false);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="ai-panel">

      {/* ── Statistical section ─────────────────────────────────────────── */}
      <div className="ai-stat-section">
        <div className="ai-section-header">
          <h3>
            Statistical Insights
            <span className="ai-section-badge ai-section-badge--stat" title="Zero-dependency pure TypeScript">
              ⚙️ Pure Stats
            </span>
          </h3>
          <p className="ai-section-desc">
            Zero-dependency pattern detection — no API key needed. Linear regression,
            Z-score anomaly detection, Pearson correlation, segment analysis, and forecasting.
          </p>
        </div>

        {statLoading && (
          <div className="ai-loading-row">
            <span className="ai-spinner" aria-label="Analysing…" />
            Analysing {dataset.source.rowCount.toLocaleString()} rows…
          </div>
        )}

        {statResult && (
          <>
            {/* Narrative */}
            <div className="ai-narrative">
              <strong>Executive Summary</strong>
              <p>{statResult.narrative}</p>
              <span className="ai-meta">
                Analysed {statResult.rowCount.toLocaleString()} rows × {statResult.columnCount} columns
                {' '}at {statResult.analyzedAt.toLocaleTimeString()}
              </span>
            </div>

            {/* Filter tabs */}
            <div className="ai-filter-tabs" role="tablist" aria-label="Filter insights by severity">
              {(['all', 'critical', 'warning', 'info'] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={filterTab === tab}
                  className={`ai-filter-tab ai-filter-tab--${tab}${filterTab === tab ? ' ai-filter-tab--active' : ''}`}
                  onClick={() => setFilterTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="ai-filter-count">{counts[tab]}</span>
                </button>
              ))}
            </div>

            {/* Insight cards */}
            <div className="ai-cards-grid" role="list" aria-label="Insight cards">
              {visibleInsights.length === 0 && (
                <p className="ai-empty">No {filterTab === 'all' ? '' : filterTab} insights detected.</p>
              )}
              {visibleInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── AI section ──────────────────────────────────────────────────────── */}
      <div className="ai-claude-section">
        <div className="ai-section-header">
          <h3>
            AI Analysis
            <span className="ai-section-badge ai-section-badge--ai">
              🤖 LLM Interpretation
            </span>
          </h3>
          <p className="ai-section-desc">
            An LLM interprets the statistical findings with business context —
            executive summaries, risk assessment, and actionable recommendations.
          </p>
        </div>

        {/* Provider picker */}
        <div className="ai-provider-row">
          <label className="ai-key-label">AI Provider</label>
          <div className="ai-provider-options" role="radiogroup" aria-label="Choose AI provider">
            <label className={`ai-provider-option${provider === 'ollama' ? ' ai-provider-option--active' : ''}`}>
              <input
                type="radio"
                name="ai-provider"
                value="ollama"
                checked={provider === 'ollama'}
                onChange={() => handleProviderChange('ollama')}
                className="ai-model-radio"
              />
              <span className="ai-provider-icon">🦙</span>
              <span className="ai-model-name">Ollama (Free)</span>
              <span className="ai-model-cost">Runs locally — 100% private</span>
            </label>
            <label className={`ai-provider-option${provider === 'anthropic' ? ' ai-provider-option--active' : ''}`}>
              <input
                type="radio"
                name="ai-provider"
                value="anthropic"
                checked={provider === 'anthropic'}
                onChange={() => handleProviderChange('anthropic')}
                className="ai-model-radio"
              />
              <span className="ai-provider-icon">🤖</span>
              <span className="ai-model-name">Claude (Anthropic)</span>
              <span className="ai-model-cost">Cloud API — highest quality</span>
            </label>
          </div>
        </div>

        {/* ── Ollama config ───────────────────────────────────────────────── */}
        {provider === 'ollama' && (
          <div className="ai-ollama-config">
            <div className="ai-ollama-info">
              <strong>🦙 Ollama — Local AI (Free &amp; Private)</strong>
              <p>
                Ollama runs open-source models on your own machine. No API key, no internet
                connection, no usage costs. Data never leaves your device.
              </p>
              <ol className="ai-ollama-steps">
                <li>Install Ollama: <code>brew install ollama</code> or download from <strong>ollama.com</strong></li>
                <li>Pull a model: <code>ollama pull llama3.2</code></li>
                <li>Start the server: <code>ollama serve</code></li>
                <li>Click Analyse below</li>
              </ol>
            </div>
            <div className="ai-key-row">
              <label className="ai-key-label" htmlFor="ollama-model-input">Model tag</label>
              <input
                id="ollama-model-input"
                className="ai-key-input"
                type="text"
                placeholder="llama3.2"
                value={ollamaModel}
                onChange={(e) => handleOllamaModelChange(e.target.value)}
                spellCheck={false}
              />
              <p className="ai-key-hint">Other options: <code>mistral</code>, <code>phi3</code>, <code>gemma2</code>, <code>qwen2.5</code></p>
            </div>
            <div className="ai-key-row">
              <label className="ai-key-label" htmlFor="ollama-url-input">Base URL</label>
              <input
                id="ollama-url-input"
                className="ai-key-input"
                type="text"
                placeholder="http://localhost:11434"
                value={ollamaBaseUrl}
                onChange={(e) => handleOllamaUrlChange(e.target.value)}
                spellCheck={false}
              />
              <p className="ai-key-hint">Default: <code>http://localhost:11434</code>. Change if running Ollama on a different port or machine.</p>
            </div>
          </div>
        )}

        {/* ── Anthropic config ────────────────────────────────────────────── */}
        {provider === 'anthropic' && (
          <>
            {/* Model selector */}
            <div className="ai-model-row">
              <label className="ai-key-label">Model</label>
              <div className="ai-model-options" role="radiogroup" aria-label="Choose Claude model">
                {ANTHROPIC_MODELS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`ai-model-option${model === opt.id ? ' ai-model-option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="ai-model"
                      value={opt.id}
                      checked={model === opt.id}
                      onChange={() => handleModelChange(opt.id)}
                      className="ai-model-radio"
                    />
                    <span className="ai-model-name">{opt.label}</span>
                    <span className="ai-model-cost">{opt.costNote}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* API key input */}
            <div className="ai-key-row">
              <label className="ai-key-label" htmlFor="api-key-input">
                Anthropic API Key
              </label>
              <div className="ai-key-field">
                <input
                  id="api-key-input"
                  className="ai-key-input"
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-ant-api03-…"
                  value={apiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Anthropic API key"
                />
                <button
                  className="ai-key-toggle"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                  type="button"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="ai-key-hint">
                Key is stored in <code>localStorage</code> on this device only.
                Get yours at <strong>console.anthropic.com</strong>.
              </p>
            </div>
          </>
        )}

        {/* Analyse button */}
        <div className="ai-controls">
          <button
            className="ai-analyse-btn"
            onClick={handleAnalyse}
            disabled={!canAnalyse || aiLoading}
            aria-busy={aiLoading}
          >
            {aiLoading ? (
              <><span className="ai-spinner ai-spinner--sm" aria-hidden="true" />Analysing…</>
            ) : (
              provider === 'ollama' ? '🦙 Analyse with Ollama' : '🤖 Analyse with Claude'
            )}
          </button>
          {aiLoading && (
            <button className="ai-cancel-btn" onClick={handleCancel} type="button">
              Cancel
            </button>
          )}
          {aiDone && !aiLoading && (
            <button
              className="ai-rerun-btn"
              onClick={handleAnalyse}
              disabled={!canAnalyse}
              type="button"
            >
              ↺ Re-run
            </button>
          )}
        </div>

        {/* Error */}
        {aiError && (
          <div className="ai-error" role="alert">
            <strong>Error:</strong> {aiError}
            {provider === 'ollama' && aiError.includes('Ollama') && (
              <details className="ai-error-help">
                <summary>Troubleshooting</summary>
                <ol>
                  <li>Is Ollama installed? Run <code>ollama --version</code></li>
                  <li>Is the server running? Run <code>ollama serve</code></li>
                  <li>Is the model pulled? Run <code>ollama pull {ollamaModel}</code></li>
                  <li>Is the URL correct? Default is <code>http://localhost:11434</code></li>
                  <li>If running from a deployed site, Ollama only allows localhost — use local dev.</li>
                </ol>
              </details>
            )}
          </div>
        )}

        {/* Streaming output */}
        {(aiText || aiLoading) && (
          <div className="ai-output-wrapper" ref={aiScrollRef} aria-live="polite" aria-label="AI analysis output">
            {aiLoading && !aiText && (
              <div className="ai-thinking">
                <span className="ai-spinner" aria-label="AI is thinking…" />
                {provider === 'ollama' ? `${ollamaModel} is thinking…` : 'Claude is thinking…'}
              </div>
            )}
            {aiText && <MarkdownText text={aiText} />}
            {aiLoading && aiText && (
              <span className="ai-cursor" aria-hidden="true">▋</span>
            )}
          </div>
        )}

        {/* Token usage + cost after completion */}
        {lastUsage && !aiLoading && (
          <div className="ai-usage-row" aria-label="Token usage">
            <span className="ai-usage-item">
              ↑ {lastUsage.inputTokens.toLocaleString()} in
            </span>
            <span className="ai-usage-item">
              ↓ {lastUsage.outputTokens.toLocaleString()} out
            </span>
            {lastUsage.cacheReadTokens > 0 && (
              <span className="ai-usage-item ai-usage-item--cached">
                ⚡ {lastUsage.cacheReadTokens.toLocaleString()} cached
              </span>
            )}
            {lastUsage.estimatedCostUsd > 0 ? (
              <span className="ai-usage-item ai-usage-item--cost">
                ${lastUsage.estimatedCostUsd.toFixed(4)} est. cost
              </span>
            ) : (
              <span className="ai-usage-item ai-usage-item--free">
                $0.00 — free (local)
              </span>
            )}
          </div>
        )}

        {!aiText && !aiLoading && !aiError && (
          <div className="ai-empty-state">
            <div className="ai-empty-icon">{provider === 'ollama' ? '🦙' : '🤖'}</div>
            {provider === 'ollama' ? (
              <>
                <p>
                  Make sure Ollama is running locally (<code>ollama serve</code>), then click{' '}
                  <strong>Analyse with Ollama</strong>. Completely free and private — no API key needed.
                </p>
                <p className="ai-compare-note">
                  Don't have Ollama? Switch to <strong>Claude (Anthropic)</strong> above — cloud-based,
                  no install required, small usage cost per run.
                </p>
              </>
            ) : (
              <>
                <p>
                  Enter your API key above and click <strong>Analyse with Claude</strong> to get
                  a business intelligence report with executive summary, risk assessment,
                  and actionable recommendations.
                </p>
                <p className="ai-compare-note">
                  Prefer free &amp; private? Switch to <strong>Ollama</strong> above — runs
                  open-source models entirely on your machine.
                </p>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
