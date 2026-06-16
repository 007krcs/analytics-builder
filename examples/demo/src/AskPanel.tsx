/**
 * AskPanel — the natural-language "ask your data" experience.
 *
 * Two tiers, one interface:
 *  - Offline (default): pure-heuristic engine, no key, no network.
 *  - LLM (optional): configure a provider; the request goes browser → endpoint
 *    directly, sends only the schema (never the rows), and returns the same
 *    typed QueryPlan. Any failure silently falls back to the offline engine.
 */

import { useEffect, useState } from 'react';
import type { Dataset } from '@gridstorm/analytix-core';
import {
  ask,
  askLLM,
  executePlan,
  summarize,
  type AskResult,
  type LlmConfig,
  type LlmProvider,
  type QueryPlan,
} from '@gridstorm/analytix-ask';

const SAMPLES = [
  'total revenue by region',
  'top 5 products by revenue',
  'revenue trend over time',
  'average units per region',
  'revenue share by category',
  'how many records are there',
];

const PROVIDERS: Array<{ id: LlmProvider; label: string; model: string; needsKey: boolean }> = [
  { id: 'openai',    label: 'OpenAI',            model: 'gpt-4o-mini',      needsKey: true },
  { id: 'anthropic', label: 'Anthropic (Claude)', model: 'claude-haiku-4-5', needsKey: true },
  { id: 'ollama',    label: 'Ollama (local, free)', model: 'llama3.2',       needsKey: false },
  { id: 'custom',    label: 'Custom (OpenAI-compatible)', model: 'gpt-4o-mini', needsKey: true },
];

const LS_KEY = 'analytix-ask-llm';

function loadConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as LlmConfig;
  } catch { /* ignore */ }
  return { provider: 'openai', model: '', apiKey: '', endpoint: '' };
}

export function AskPanel({ dataset }: { dataset: Dataset }) {
  const [question, setQuestion] = useState('total revenue by region');
  const [cfg, setCfg] = useState<LlmConfig>(loadConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<QueryPlan | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [answer, setAnswer] = useState('');

  const provider = PROVIDERS.find((p) => p.id === cfg.provider) ?? PROVIDERS[0];
  const llmReady = provider.needsKey ? !!cfg.apiKey : true;

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, [cfg]);

  async function run(q: string) {
    const text = q.trim();
    if (!text || !dataset) return;
    setQuestion(text);
    let p: QueryPlan;
    if (llmReady) {
      setLoading(true);
      try { p = await askLLM(text, dataset, cfg); }
      finally { setLoading(false); }
    } else {
      p = ask(text, dataset);
    }
    const r = executePlan(p, dataset);
    setPlan(p); setResult(r); setAnswer(summarize(p, r));
  }

  // First render: answer the default question once.
  useEffect(() => { if (dataset && !plan) void run('total revenue by region'); /* eslint-disable-line */ }, [dataset]);

  const measureCol = result?.columns[result.columns.length - 1] ?? '';
  const dimCol = result && result.columns.length > 1 ? result.columns[0] : null;
  const maxVal = result ? Math.max(...result.rows.map((r) => Number(r[measureCol] ?? 0)), 1) : 1;

  return (
    <section className="demo-section" aria-labelledby="ask-heading">
      <div className="demo-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h2 id="ask-heading">Ask your data</h2>
          <p>
            Type a question in plain English. Analytix turns it into a typed query plan,
            runs it locally, and answers. <strong>Offline by default — no key, no network,
            and your data never leaves the browser.</strong> Add an LLM provider for richer
            phrasing; it only ever sees the schema, never the rows.
          </p>
        </div>
        <button
          onClick={() => setShowConfig((s) => !s)}
          style={{ flexShrink: 0, background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#4338ca', cursor: 'pointer' }}
        >
          {showConfig ? '▼ Hide AI config' : '⚙ Configure AI'}
        </button>
      </div>

      {/* LLM provider config — mirrors a "bring your own key" setup */}
      {showConfig && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 18, background: '#fafafa' }}>
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#3730a3', marginBottom: 14 }}>
            🔒 Your API key stays in this browser's localStorage. Requests go directly from your browser to the endpoint you configure — never through our servers.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Provider">
              <select value={cfg.provider} onChange={(e) => setCfg({ ...cfg, provider: e.target.value as LlmProvider, model: '' })} style={inputStyle}>
                {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Model" hint={`Default: ${provider.model}`}>
              <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder={provider.model} style={inputStyle} />
            </Field>
            {provider.needsKey && (
              <Field label="API key" hint="Never logged. Only sent to the endpoint below.">
                <input type="password" value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder="paste your key" style={inputStyle} />
              </Field>
            )}
            <Field label="Endpoint (optional)" hint="Leave blank for the provider default.">
              <input value={cfg.endpoint} onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })} placeholder={provider.id === 'ollama' ? 'http://localhost:11434/api/chat' : 'https://api.openai.com/v1/chat/completions'} style={inputStyle} />
            </Field>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void run(question); }} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          aria-label="Ask a question about your data"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. top 5 products by revenue"
          style={{ flex: 1, padding: '12px 14px', fontSize: 15, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '12px 22px', fontSize: 15, fontWeight: 600, borderRadius: 8, border: 'none', background: loading ? '#a5b4fc' : 'linear-gradient(180deg,#4f46e5,#4338ca)', color: '#fff', cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Thinking…' : 'Ask →'}
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {SAMPLES.map((s) => (
          <button key={s} onClick={() => void run(s)} style={{ padding: '6px 12px', fontSize: 13, borderRadius: 999, border: '1px solid #e2e8f0', background: s === question ? '#eef2ff' : '#fff', color: s === question ? '#4338ca' : '#475569', cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      {plan && result && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg,#eef2ff,#faf5ff)', border: '1px solid #c7d2fe', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6366f1' }}>Answer</div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: plan.source === 'llm' ? '#dcfce7' : '#f1f5f9', color: plan.source === 'llm' ? '#15803d' : '#475569' }}>
                {plan.source === 'llm' ? `LLM · ${provider.label}` : 'Offline engine'}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', marginTop: 6, lineHeight: 1.35 }}>{answer}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 13, color: '#475569' }}>
              <span>📐 Interpreted as: <strong>{plan.explanation}</strong></span>
              <span>📊 Suggested chart: <strong>{plan.chartType}</strong></span>
              <span>🎯 Confidence: <strong>{Math.round(plan.confidence * 100)}%</strong></span>
            </div>
            {plan.unresolved.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: '#b45309' }}>
                Couldn’t map: {plan.unresolved.join(', ')} — try a column name from the dataset, or enable an AI provider.
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>{result.columns.map((c) => (
                  <th key={c} style={{ textAlign: c === measureCol ? 'right' : 'left', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    {result.columns.map((c) => {
                      const v = row[c];
                      const isMeasure = c === measureCol;
                      const pct = isMeasure ? (Number(v ?? 0) / maxVal) * 100 : 0;
                      return (
                        <td key={c} style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', textAlign: isMeasure ? 'right' : 'left', position: 'relative' }}>
                          {isMeasure && dimCol && (
                            <span style={{ position: 'absolute', left: 8, right: 8, top: '50%', transform: 'translateY(-50%)', height: 22, background: 'linear-gradient(90deg,#e0e7ff,#c7d2fe)', borderRadius: 4, width: `${Math.max(2, pct)}%`, zIndex: 0 }} />
                          )}
                          <span style={{ position: 'relative', zIndex: 1, fontWeight: isMeasure ? 600 : 400 }}>
                            {typeof v === 'number' ? v.toLocaleString() : v ?? '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
            Computed from {result.matchedRows.toLocaleString()} matching rows.
            {plan.source === 'llm' ? ' Only the schema was sent to the model — no rows left your browser.' : ' No network request was made.'}
          </p>
        </div>
      )}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: '#fff',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{hint}</span>}
    </label>
  );
}
