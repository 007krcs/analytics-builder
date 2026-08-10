/**
 * ConnectPanel — live API ingestion.
 *
 * Connect to a real-time source three ways and watch rows arrive live:
 *  - WebSocket  → connectWebSocket (auto-reconnect + batching)
 *  - SSE        → connectSSE (EventSource framing + batching)
 *  - HTTP poll  → setInterval + fetch on a fixed cadence
 *
 * Everything stays in the browser; rows are rendered into a live table.
 */

import { useEffect, useRef, useState } from 'react';
import type { Row } from '@gridstorm/analytix-core';
import { connectSSE, connectWebSocket } from '@gridstorm/analytix-data-connector';
import { liveFeed } from './liveFeed.js';

/** Human-readable failure text; browser fetch/SSE errors are usually CORS. */
function describeFetchError(e: unknown): string {
  if (e instanceof TypeError) {
    return 'Request failed — most likely CORS: the endpoint must send Access-Control-Allow-Origin for this site. '
      + 'Point at a CORS-enabled endpoint or your own server; browsers block everything else before it leaves the page.';
  }
  return String(e);
}

type Mode = 'ws' | 'sse' | 'poll';
type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

interface LiveHandle { disconnect: () => void; }

export function ConnectPanel() {
  const [mode, setMode] = useState<Mode>('ws');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [intervalMs, setIntervalMs] = useState(2000);
  const [status, setStatus] = useState<Status>('disconnected');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRef = useRef<LiveHandle | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => teardown(), []); // cleanup on unmount

  function teardown() {
    handleRef.current?.disconnect();
    handleRef.current = null;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function ingest(batch: Row[]) {
    setRows((prev) => [...batch, ...prev].slice(0, 200));
    liveFeed.publish(batch); // Sentinel can watch this feed
  }

  function disconnect() {
    teardown();
    setStatus('disconnected');
  }

  function connect() {
    setError(null);
    setRows([]);
    if (!url.trim()) { setError('Enter an endpoint URL.'); return; }
    teardown();
    setStatus('connecting');

    try {
      if (mode === 'ws') {
        const c = connectWebSocket(url.trim(), {
          batchSize: 1, flushIntervalMs: 250,
          onOpen: () => setStatus('connected'),
          onBatch: ingest,
          onError: () => { setStatus('error'); setError('WebSocket error — will retry.'); },
        });
        handleRef.current = c;
      } else if (mode === 'sse') {
        const c = connectSSE(url.trim(), {
          batchSize: 1, flushIntervalMs: 250,
          onOpen: () => setStatus('connected'),
          onBatch: ingest,
          onError: () => { setStatus('error'); setError('SSE error — often CORS (the endpoint must allow this origin) or a non-event-stream response. EventSource will retry.'); },
        });
        handleRef.current = c;
        setStatus('connected');
      } else {
        // HTTP poll
        const headers: Record<string, string> = {};
        if (token.trim()) headers.Authorization = `Bearer ${token.trim()}`;
        const poll = async () => {
          try {
            const res = await fetch(url.trim(), { method, headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as unknown;
            const batch = Array.isArray(data) ? data as Row[] : [data as Row];
            setStatus('connected');
            ingest(batch);
          } catch (e) {
            setStatus('error');
            setError(describeFetchError(e));
          }
        };
        void poll();
        pollRef.current = setInterval(() => void poll(), Math.max(250, intervalMs));
      }
    } catch (e) {
      setStatus('error');
      setError(String(e));
    }
  }

  const columns = rows.length ? Object.keys(rows[0]) : [];
  const live = status === 'connected' || status === 'connecting';

  return (
    <section className="demo-section" aria-labelledby="connect-heading">
      <div className="demo-section-header">
        <h2 id="connect-heading">Connect a live API</h2>
        <p>
          Stream real-time data into the browser via <strong>WebSocket</strong>,
          <strong> Server-Sent Events</strong>, or <strong>HTTP polling</strong>. Rows arrive
          live below — then explore them in any other tab. Nothing is proxied; the connection
          is browser → endpoint directly.
        </p>
      </div>

      <div className="ap-split">
        {/* ── Controls ── */}
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            {(['ws', 'sse', 'poll'] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '8px 14px', fontSize: 13.5, fontWeight: 600, background: 'none', cursor: 'pointer',
                border: 'none', borderBottom: mode === m ? '2px solid #4f46e5' : '2px solid transparent',
                color: mode === m ? '#4338ca' : '#64748b',
              }}>
                {m === 'ws' ? 'WebSocket' : m === 'sse' ? 'SSE' : 'HTTP poll'}
              </button>
            ))}
          </div>

          <Field label="Endpoint URL" hint={
            mode === 'ws' ? 'A ws:// or wss:// WebSocket URL streaming JSON messages. (WebSockets are not subject to CORS.)'
            : mode === 'sse' ? 'An http(s) endpoint that streams text/event-stream. Must allow this origin via CORS (Access-Control-Allow-Origin).'
            : 'An HTTP endpoint returning JSON, polled on a fixed interval. Must allow this origin via CORS (Access-Control-Allow-Origin).'
          }>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={
              mode === 'ws' ? 'wss://example.com/feed' : 'https://example.com/api/stream'
            } style={inp} />
          </Field>

          {mode === 'poll' && (
            <Field label="Auth token (optional)" hint="Sent as `Authorization: Bearer <token>`.">
              <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="paste a bearer token" style={inp} />
            </Field>
          )}

          {mode === 'poll' && (
            <div className="ap-two">
              <Field label="Method">
                <select value={method} onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')} style={inp}>
                  <option>GET</option><option>POST</option>
                </select>
              </Field>
              <Field label="Interval (ms)">
                <input type="number" min={250} step={250} value={intervalMs} onChange={(e) => setIntervalMs(Number(e.target.value))} style={inp} />
              </Field>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            {!live ? (
              <button onClick={connect} style={btnPrimary}>▶ Connect</button>
            ) : (
              <button onClick={disconnect} style={btnDanger}>■ Disconnect</button>
            )}
            <StatusBadge status={status} />
          </div>
          {error && <p style={{ color: '#b91c1c', fontSize: 12.5, marginTop: 8 }}>{error}</p>}
        </div>

        {/* ── Live table ── */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, minHeight: 320, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
            <strong style={{ fontSize: 14 }}>Live data</strong>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{rows.length} rows</span>
              <StatusBadge status={status} />
            </span>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            {rows.length === 0 ? (
              <div style={{ display: 'grid', placeItems: 'center', height: 260, color: '#94a3b8', fontSize: 14 }}>
                No data yet — connect to a source on the left to begin.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{columns.map((c) => (
                    <th key={c} style={{ textAlign: 'left', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>{c}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i}>{columns.map((c) => (
                      <td key={c} style={{ padding: '7px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        {formatCell(r[c])}
                      </td>
                    ))}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { t: string; bg: string; fg: string }> = {
    disconnected: { t: 'Disconnected', bg: '#f1f5f9', fg: '#64748b' },
    connecting:   { t: 'Connecting…', bg: '#fef9c3', fg: '#a16207' },
    connected:    { t: 'Connected',   bg: '#dcfce7', fg: '#15803d' },
    error:        { t: 'Error',       bg: '#fee2e2', fg: '#b91c1c' },
  };
  const s = map[status];
  return <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: s.bg, color: s.fg }}>{s.t}</span>;
}

function formatCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: '#fff' };
const btnPrimary: React.CSSProperties = { padding: '10px 18px', fontWeight: 600, fontSize: 14, border: 'none', borderRadius: 8, background: 'linear-gradient(180deg,#16a34a,#15803d)', color: '#fff', cursor: 'pointer' };
const btnDanger: React.CSSProperties = { padding: '10px 18px', fontWeight: 600, fontSize: 14, border: 'none', borderRadius: 8, background: 'linear-gradient(180deg,#ef4444,#b91c1c)', color: '#fff', cursor: 'pointer' };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 4, marginBottom: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{hint}</span>}
    </label>
  );
}
