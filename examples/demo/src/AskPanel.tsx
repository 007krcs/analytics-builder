/**
 * AskPanel — the natural-language "ask your data" experience.
 *
 * Demonstrates @gridstorm/analytix-ask: type a plain-English question, get a
 * typed query plan, a computed answer, and a result table — entirely offline,
 * with no API key and no data leaving the browser.
 */

import { useMemo, useState } from 'react';
import type { Dataset } from '@gridstorm/analytix-core';
import {
  ask,
  executePlan,
  summarize,
  type AskResult,
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

export function AskPanel({ dataset }: { dataset: Dataset }) {
  const [question, setQuestion] = useState('total revenue by region');
  const [submitted, setSubmitted] = useState<string | null>('total revenue by region');

  const { plan, result, answer } = useMemo<{
    plan: QueryPlan | null;
    result: AskResult | null;
    answer: string;
  }>(() => {
    if (!submitted || !dataset) return { plan: null, result: null, answer: '' };
    const p = ask(submitted, dataset);
    const r = executePlan(p, dataset);
    return { plan: p, result: r, answer: summarize(p, r) };
  }, [submitted, dataset]);

  const maxVal = result
    ? Math.max(...result.rows.map((row) => Number(row[result.columns[result.columns.length - 1]] ?? 0)), 1)
    : 1;
  const measureCol = result?.columns[result.columns.length - 1] ?? '';
  const dimCol = result && result.columns.length > 1 ? result.columns[0] : null;

  return (
    <section className="demo-section" aria-labelledby="ask-heading">
      <div className="demo-section-header">
        <h2 id="ask-heading">Ask your data</h2>
        <p>
          Type a question in plain English. Analytix turns it into a typed query plan,
          runs it locally, and answers — <strong>offline, no API key, and your data never
          leaves the browser.</strong> An optional LLM tier (local Ollama or your own key) can
          handle more complex phrasing; it only ever sees the schema, never the rows.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setSubmitted(question.trim()); }}
        style={{ display: 'flex', gap: 8, marginBottom: 14 }}
      >
        <input
          aria-label="Ask a question about your data"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. top 5 products by revenue"
          style={{
            flex: 1, padding: '12px 14px', fontSize: 15, borderRadius: 8,
            border: '1px solid #cbd5e1', outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '12px 22px', fontSize: 15, fontWeight: 600, borderRadius: 8,
            border: 'none', background: 'linear-gradient(180deg,#4f46e5,#4338ca)',
            color: '#fff', cursor: 'pointer',
          }}
        >
          Ask →
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => { setQuestion(s); setSubmitted(s); }}
            style={{
              padding: '6px 12px', fontSize: 13, borderRadius: 999,
              border: '1px solid #e2e8f0', background: s === submitted ? '#eef2ff' : '#fff',
              color: s === submitted ? '#4338ca' : '#475569', cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {plan && result && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Answer card */}
          <div style={{
            background: 'linear-gradient(135deg,#eef2ff,#faf5ff)',
            border: '1px solid #c7d2fe', borderRadius: 14, padding: '20px 22px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6366f1' }}>
              Answer
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', marginTop: 6, lineHeight: 1.35 }}>
              {answer}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 13, color: '#475569' }}>
              <span>📐 Interpreted as: <strong>{plan.explanation}</strong></span>
              <span>📊 Suggested chart: <strong>{plan.chartType}</strong></span>
              <span>🎯 Confidence: <strong>{Math.round(plan.confidence * 100)}%</strong></span>
            </div>
            {plan.unresolved.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12.5, color: '#b45309' }}>
                Couldn’t map: {plan.unresolved.join(', ')} — try a column name from the dataset.
              </div>
            )}
          </div>

          {/* Result table + inline bars */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {result.columns.map((c) => (
                    <th key={c} style={{ textAlign: c === measureCol ? 'right' : 'left', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                      {c}
                    </th>
                  ))}
                </tr>
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
            Computed from {result.matchedRows.toLocaleString()} matching rows · pure-TypeScript heuristic engine ·
            no network request was made.
          </p>
        </div>
      )}
    </section>
  );
}
