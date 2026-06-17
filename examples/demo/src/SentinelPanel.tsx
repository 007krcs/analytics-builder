/**
 * SentinelPanel — the autonomous monitor.
 *
 * Drives @gridstorm/analytix-monitor against a simulated live metric stream:
 * a noisy requests-per-second signal with periodically injected spikes/drops.
 * Sentinel watches the window, finds + explains anomalies, filters by severity,
 * optionally enriches with the configured LLM, and (optionally) POSTs each
 * finding to a webhook.
 */

import { useEffect, useRef, useState } from 'react';
import { Sentinel, type Finding, type Severity } from '@gridstorm/analytix-monitor';
import type { LlmConfig } from '@gridstorm/analytix-ask';

const SEV_COLOR: Record<Severity, { bg: string; fg: string; bd: string }> = {
  info:     { bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  warning:  { bg: '#fffbeb', fg: '#b45309', bd: '#fde68a' },
  critical: { bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' },
};

/** One-sentence anomaly explanation via the configured LLM (best-effort). */
async function llmExplain(text: string, cfg: LlmConfig): Promise<string> {
  const model = cfg.model || (cfg.provider === 'anthropic' ? 'claude-haiku-4-5' : cfg.provider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini');
  const sys = 'You are an SRE assistant. Explain the monitoring finding in ONE concise sentence with a likely cause. No preamble.';
  let url: string, init: RequestInit;
  if (cfg.provider === 'anthropic') {
    url = cfg.endpoint || 'https://api.anthropic.com/v1/messages';
    init = { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey ?? '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model, max_tokens: 120, system: sys, messages: [{ role: 'user', content: text }] }) };
  } else if (cfg.provider === 'ollama') {
    url = cfg.endpoint || 'http://localhost:11434/api/chat';
    init = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: sys }, { role: 'user', content: text }] }) };
  } else {
    url = cfg.endpoint || 'https://api.openai.com/v1/chat/completions';
    init = { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey ?? ''}` }, body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: 'system', content: sys }, { role: 'user', content: text }] }) };
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json() as Record<string, unknown>;
  if (cfg.provider === 'anthropic') return (j.content as Array<{ text?: string }>)?.[0]?.text?.trim() ?? text;
  if (cfg.provider === 'ollama') return ((j.message as { content?: string })?.content ?? text).trim();
  return ((j.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content ?? text).trim();
}

export function SentinelPanel() {
  const [on, setOn] = useState(false);
  const [alertLevel, setAlertLevel] = useState<Severity>('info');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enrich, setEnrich] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [tick, setTick] = useState(0);

  const sentinelRef = useRef<Sentinel | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);

  // Rebuild the Sentinel whenever its config changes.
  useEffect(() => {
    const cfgRaw = (() => { try { return JSON.parse(localStorage.getItem('analytix-ask-llm') ?? 'null') as LlmConfig | null; } catch { return null; } })();
    const llmReady = !!cfgRaw && (cfgRaw.provider === 'ollama' || !!cfgRaw.apiKey);
    sentinelRef.current = new Sentinel({
      numericColumns: ['requests_per_sec', 'latency_ms'],
      windowSize: 20,
      minSamples: 8,
      zThreshold: 3,
      alertLevel,
      webhookUrl: webhookUrl.trim() || undefined,
      enrich: enrich && llmReady && cfgRaw
        ? async (f) => llmExplain(`${f.title}: ${f.description}`, cfgRaw)
        : undefined,
      onFinding: (f) => setFindings((prev) => [f, ...prev].slice(0, 40)),
    });
  }, [alertLevel, webhookUrl, enrich]);

  // Simulated live stream.
  useEffect(() => {
    if (!on) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      const step = stepRef.current++;
      const noise = () => (Math.sin(step * 1.7) + Math.cos(step * 0.9)) * 4;
      let rps = 120 + noise();
      let latency = 45 + noise() * 0.5;
      // Inject an anomaly every ~16 ticks (alternating spike / drop / latency).
      if (step > 9 && step % 16 === 0) rps = 320 + noise();          // traffic spike
      else if (step > 9 && step % 16 === 8) rps = 18 + noise();      // traffic drop / outage
      else if (step > 9 && step % 23 === 0) latency = 480 + noise(); // latency spike
      void sentinelRef.current?.push([{ requests_per_sec: Math.round(rps), latency_ms: Math.round(latency) }]);
      setTick((t) => t + 1);
    }, 700);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [on]);

  return (
    <section className="demo-section" aria-labelledby="sentinel-heading">
      <div className="demo-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h2 id="sentinel-heading">✦ Sentinel — autonomous monitor</h2>
          <p>
            Watches a (simulated) live metric stream and <strong>investigates anomalies the
            moment they appear</strong> — spikes, drops, flatlines, threshold breaches —
            explaining each in plain English. Filter by severity, post findings to a webhook,
            and optionally enrich explanations with your configured LLM.
          </p>
        </div>
        <label style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
          {on ? 'On' : 'Off'}
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 40, height: 22 }} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Alert on</span>
          <select value={alertLevel} onChange={(e) => setAlertLevel(e.target.value as Severity)} style={selStyle}>
            <option value="info">Info and above (noisy)</option>
            <option value="warning">Warning and above</option>
            <option value="critical">Critical only</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Webhook URL (optional)</span>
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.slack.com/… or your endpoint" style={selStyle} />
          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Each finding is POSTed as JSON (Slack-compatible). Browser CORS may block Slack directly — use your own endpoint.</span>
        </label>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#334155', marginBottom: 16 }}>
        <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
        Enrich explanations with my configured LLM (uses the provider from the “Ask your data” tab)
      </label>

      {findings.length === 0 ? (
        <div style={{ background: on ? '#eef2ff' : '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 22 }}>{on ? '🛰️' : '💤'}</span>
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{on ? 'Watching…' : 'Sentinel is off'}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {on
                ? `No findings yet — Sentinel investigates anomalies the moment the engine detects them (${tick} readings observed).`
                : 'Toggle it On to start watching the live stream.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {findings.map((f) => {
            const c = SEV_COLOR[f.severity];
            return (
              <div key={f.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 10, background: c.bg, border: `1px solid ${c.bd}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', color: c.fg, padding: '2px 8px', borderRadius: 999, background: '#fff', border: `1px solid ${c.bd}`, height: 'fit-content' }}>
                  {f.severity.toUpperCase()}
                </span>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{f.title}</div>
                  <div style={{ fontSize: 13.5, color: '#475569', marginTop: 2 }}>{f.description}</div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                    {f.type}{f.zScore != null ? ` · z=${f.zScore}` : ''}{f.baseline != null ? ` · baseline ${f.baseline}` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const selStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: '#fff',
};
