/**
 * AskPanel — the natural-language "ask your data" experience.
 *
 * Two tiers, one interface:
 *  - Offline (default): pure-heuristic engine, no key, no network.
 *  - LLM (optional): configure a provider; the request goes browser → endpoint
 *    directly, sends only the schema (never the rows), and returns the same
 *    typed QueryPlan. Any failure silently falls back to the offline engine.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset } from '@gridstorm/analytix-core';
import { parseCsvFile, parseExcelFile } from '@gridstorm/analytix-data-connector';
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
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, Tooltip, XAxis, YAxis,
} from 'recharts';

const TIME_TYPES = ['date', 'datetime', 'time'];

/** Identifier-ish columns (id, order_id, uuid…) — numeric but meaningless to SUM. */
const IDENT_RE = /(^|[_\s-])(id|key|uuid|guid|code|index)s?$/i;
/** Calendar-part columns (year, quarter…) — numeric but meaningless to AVG. */
const CALENDAR_RE = /^(year|quarter|month|week|day|date|time|hour)s?$/i;

/** Build suggestion chips from the ACTIVE dataset's schema, so an uploaded
 *  CSV gets questions about ITS columns instead of sales-specific ones. */
function buildSamples(ds: Dataset): string[] {
  const nameOf = (c: Dataset['columns'][number]) => c.displayName || c.id;
  // Real measures only: numeric + aggregatable, but never identifiers,
  // calendar parts, or all-unique columns ("total id by quarter" is garbage).
  const measures = ds.columns.filter(
    (c) => c.aggregatable
      && ['number', 'integer', 'float', 'currency', 'percentage'].includes(c.type)
      && !IDENT_RE.test(c.id) && !IDENT_RE.test(nameOf(c))
      && !CALENDAR_RE.test(c.id) && !CALENDAR_RE.test(nameOf(c))
      // `unique` is set by some connectors but absent from the core type.
      && (c as { unique?: boolean }).unique !== true,
  );
  // Categorical dims first; calendar-named dims last (the trend chip covers time).
  const dims = ds.columns
    .filter((c) => c.dimensional && !TIME_TYPES.includes(c.type) && !IDENT_RE.test(c.id))
    .sort((a, b) => Number(CALENDAR_RE.test(a.id)) - Number(CALENDAR_RE.test(b.id)));
  const timeCol = ds.columns.find((c) => TIME_TYPES.includes(c.type) || CALENDAR_RE.test(c.id));
  const lc = (s: string) => s.toLowerCase();

  const out: string[] = [];
  const m0 = measures[0], m1 = measures[1] ?? measures[0];
  const d0 = dims[0], d1 = dims[1] ?? dims[0];
  if (m0 && d0) out.push(`total ${lc(nameOf(m0))} by ${lc(nameOf(d0))}`);
  if (m0 && d1) out.push(`top 5 ${lc(nameOf(d1))} by ${lc(nameOf(m0))}`);
  if (m0 && timeCol) out.push(`${lc(nameOf(m0))} trend over time`);
  if (m1 && d0) out.push(`average ${lc(nameOf(m1))} per ${lc(nameOf(d0))}`);
  if (m0 && d1) out.push(`${lc(nameOf(m0))} share by ${lc(nameOf(d1))}`);
  out.push('how many records are there');
  return Array.from(new Set(out)).slice(0, 6);
}

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

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

/** Question deep-linked in the URL: /#demo?q=… */
function questionFromHash(): string | null {
  try {
    const m = window.location.hash.match(/[?&]q=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

export interface AskPanelProps {
  dataset: Dataset;
  /** Called when the user uploads a file, so the app can register it with the
   *  engine and make it explorable in the Pivot/Chart/KPI tabs too. */
  onDatasetUploaded?: (ds: Dataset) => void;
}

export function AskPanel({ dataset, onDatasetUploaded }: AskPanelProps) {
  const [question, setQuestion] = useState(() => questionFromHash() ?? 'total revenue by region');
  const [cfg, setCfg] = useState<LlmConfig>(loadConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<QueryPlan | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);
  const [answer, setAnswer] = useState('');
  // "Ask your OWN data" — an uploaded CSV replaces the sample dataset.
  const [uploaded, setUploaded] = useState<Dataset | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeDs = uploaded ?? dataset;
  const samples = useMemo(() => (activeDs ? buildSamples(activeDs) : []), [activeDs]);

  const provider = PROVIDERS.find((p) => p.id === cfg.provider) ?? PROVIDERS[0];
  const llmReady = provider.needsKey ? !!cfg.apiKey : true;

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  }, [cfg]);

  async function run(q: string, dsOverride?: Dataset) {
    const ds = dsOverride ?? activeDs;
    const text = q.trim();
    if (!text || !ds) return;
    setQuestion(text);
    let p: QueryPlan;
    if (llmReady) {
      setLoading(true);
      try { p = await askLLM(text, ds, cfg); }
      finally { setLoading(false); }
    } else {
      // Offline tier gets the previous plan as context so refinements like
      // "now just Europe" work. Not carried across a dataset switch.
      p = ask(text, ds, { context: dsOverride ? undefined : plan ?? undefined });
    }
    const r = executePlan(p, ds);
    setPlan(p); setResult(r); setAnswer(summarize(p, r));
    // Deep-linkable question: /#demo?q=…
    try {
      window.history.replaceState(null, '', `${window.location.pathname}#demo?q=${encodeURIComponent(text)}`);
    } catch { /* ignore */ }
  }

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`That file is ${(file.size / 1024 / 1024).toFixed(0)} MB — the in-browser limit is 50 MB.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const parsed = isExcel ? await parseExcelFile(file) : await parseCsvFile(file);
      if (!parsed.rows.length) { setUploadError('No rows found in that file — is it a valid CSV or Excel sheet?'); return; }
      setUploaded(parsed);
      onDatasetUploaded?.(parsed);
      // Prove it works instantly with a question that fits ANY schema,
      // computed against the freshly parsed dataset (state not yet applied).
      const firstChip = buildSamples(parsed)[0] ?? 'how many records are there';
      void run(firstChip, parsed);
    } catch (e) {
      setUploadError(`Could not parse that file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      if (fileRef.current) fileRef.current.value = ''; // allow re-picking the same file
    }
  }

  function resetToSample() {
    setUploaded(null);
    setUploadError(null);
    void run('total revenue by region', dataset);
  }

  // First render: answer the default (or deep-linked ?q=) question once.
  useEffect(() => { if (dataset && !plan) void run(question); /* eslint-disable-line */ }, [dataset]);

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
        <div style={{ flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ background: 'none', border: '1px solid #c7d2fe', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#4338ca', cursor: 'pointer' }}
          >
            📁 Upload CSV / Excel
          </button>
          <button
            onClick={() => setShowConfig((s) => !s)}
            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#4338ca', cursor: 'pointer' }}
          >
            {showConfig ? '▼ Hide AI config' : '⚙ Configure AI'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          onChange={(e) => void onFilePicked(e.target.files?.[0])}
          style={{ display: 'none' }}
          aria-label="Upload a CSV or Excel file to ask questions about"
        />
      </div>

      {/* Active dataset strip — which data are we asking? */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, padding: '4px 11px', borderRadius: 999, background: uploaded ? '#dcfce7' : '#eef2ff', color: uploaded ? '#15803d' : '#4338ca', border: `1px solid ${uploaded ? '#86efac' : '#c7d2fe'}` }}>
          {uploaded ? `📄 ${uploaded.name}` : '📊 Sample sales data'}
          {' · '}{activeDs.rows.length.toLocaleString()} rows · {activeDs.columns.length} columns
        </span>
        {uploaded && (
          <>
            <button onClick={resetToSample} style={{ background: 'none', border: 'none', fontSize: 12.5, color: '#64748b', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              ✕ Back to sample data
            </button>
            {onDatasetUploaded && (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Also available in the Pivot Builder and Chart Builder tabs.
              </span>
            )}
          </>
        )}
        {uploadError && <span role="alert" style={{ fontSize: 12.5, color: '#b91c1c' }}>{uploadError}</span>}
      </div>

      {/* LLM provider config — mirrors a "bring your own key" setup */}
      {showConfig && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, marginBottom: 18, background: '#fafafa' }}>
          <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#3730a3', marginBottom: 14 }}>
            🔒 Your API key stays in this browser's localStorage. Requests go directly from your browser to the endpoint you configure — never through our servers.
          </div>
          <div className="ap-two">
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
        {samples.map((s) => (
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

          {/* The suggested chart, actually rendered — not just named. */}
          {plan.dimensions.length > 0 && result.rows.length > 1 && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px 8px', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
                {plan.chartType === 'pie' ? 'Share' : plan.chartType === 'line' ? 'Trend' : 'Comparison'} · {plan.chartType} chart
                {' · '}
                {plan.chartType === 'pie'
                  ? plan.measures[0]?.label
                  : plan.measures.map((m) => m.label).join(' & ')}
                {result.rows.length > 20 && ` · showing 20 of ${result.rows.length}`}
              </div>
              <AnswerChart plan={plan} result={result} />
            </div>
          )}

          <div className="ap-tablewrap" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
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
            {result.rows.length > 20 && `Table shows the first 20 of ${result.rows.length.toLocaleString()} groups. `}
            Computed from {result.matchedRows.toLocaleString()} matching rows.
            {plan.source === 'llm' ? ' Only the schema was sent to the model — no rows left your browser.' : ' No network request was made.'}
          </p>
        </div>
      )}
    </section>
  );
}

// ── Chart rendering ───────────────────────────────────────────

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#3b82f6', '#ef4444', '#84cc16'];

/**
 * Own container measurement instead of recharts' <ResponsiveContainer>:
 * inside this CSS-grid layout, ResponsiveContainer captured its very first
 * measurement (mid-layout, 122px) and its observer never re-fired — pinning
 * every chart to a sliver. A plain ResizeObserver on our own div is
 * deterministic and tracks viewport changes correctly.
 */
function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.getBoundingClientRect().width));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Render the plan's suggested chart from the computed result rows. */
function AnswerChart({ plan, result }: { plan: QueryPlan; result: AskResult }) {
  const [wrapRef, width] = useContainerWidth();
  const dimKey = result.columns[0];
  // Dimensions come first in result.columns; everything after is a measure.
  // Charts plot up to two measures (grouped bars / two lines); pie plots one.
  const measureKeys = result.columns.slice(Math.max(1, plan.dimensions.length)).slice(0, 2);
  const primaryKey = measureKeys[0] ?? result.columns[result.columns.length - 1];

  let data = result.rows.slice(0, 20).map((r) => {
    const o: Record<string, string | number> = { name: String(r[dimKey] ?? '—') };
    for (const k of measureKeys) o[k] = Number(r[k] ?? 0);
    return o;
  });

  const fmtTick = (v: number) =>
    Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : Math.abs(v) >= 1_000 ? `${(v / 1_000).toFixed(0)}k`
    : String(v);
  const fmtTip = (v: number | string, name?: string) =>
    [Number(v).toLocaleString(), name ?? primaryKey] as [string, string];
  const multi = measureKeys.length > 1;

  let chart: React.ReactNode = null;
  if (width > 0 && plan.chartType === 'pie') {
    // Cap slices so the pie stays readable; fold the tail into "Other".
    if (data.length > 8) {
      const head = data.slice(0, 7);
      const other = data.slice(7).reduce((a, d) => a + Number(d[primaryKey] ?? 0), 0);
      data = [...head, { name: `Other (${result.rows.length - 7} more)`, [primaryKey]: other }];
    }
    chart = (
      <PieChart width={width} height={280}>
        <Pie data={data} dataKey={primaryKey} nameKey="name" cx="50%" cy="50%" outerRadius={95} label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={fmtTip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    );
  } else if (width > 0 && plan.chartType === 'line') {
    chart = (
      <LineChart width={width} height={280} data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtTick} tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={fmtTip} />
        {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {measureKeys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k} name={k} stroke={CHART_COLORS[i]} strokeWidth={2.5} dot={{ r: 3 }} />
        ))}
      </LineChart>
    );
  } else if (width > 0) {
    // Default: bar (also covers any other suggestion when a dimension exists).
    chart = (
      <BarChart width={width} height={280} data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtTick} tick={{ fontSize: 11 }} width={48} />
        <Tooltip formatter={fmtTip} />
        {multi && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {measureKeys.map((k, i) => (
          <Bar key={k} dataKey={k} name={k} radius={[6, 6, 0, 0]} fill={CHART_COLORS[i]}>
            {/* Per-category colors only for a single series; grouped bars keep one color per series. */}
            {!multi && data.map((_, j) => <Cell key={j} fill={CHART_COLORS[j % CHART_COLORS.length]} />)}
          </Bar>
        ))}
      </BarChart>
    );
  }

  return <div ref={wrapRef} style={{ width: '100%', minHeight: 280 }}>{chart}</div>;
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
