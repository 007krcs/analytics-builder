import { describe, expect, it, vi } from 'vitest';
import { Sentinel, type Finding } from './index.js';

// Deterministic id + time so assertions are stable.
function mkSentinel(extra: Partial<ConstructorParameters<typeof Sentinel>[0]> = {}) {
  let t = 1_000;
  return new Sentinel({
    numericColumns: ['value'],
    windowSize: 12,
    minSamples: 8,
    zThreshold: 3,
    now: () => (t += 1000),
    idGen: (() => { let n = 0; return () => `f${++n}`; })(),
    ...extra,
  });
}

/** A noisy-but-stable series around 100 (std ≈ 1.4). */
const STABLE = [100, 101, 99, 100, 102, 98, 101, 99, 100, 101].map((v) => ({ value: v }));

describe('Sentinel — spike / drop detection', () => {
  it('detects a spike well above the recent baseline', async () => {
    const s = mkSentinel();
    expect(await s.push(STABLE)).toHaveLength(0); // warming up, all normal
    const found = await s.push([{ value: 180 }]);
    expect(found).toHaveLength(1);
    expect(found[0].type).toBe('spike');
    expect(found[0].column).toBe('value');
    expect(found[0].value).toBe(180);
    expect(found[0].severity).toBe('critical'); // huge z
    expect(found[0].description).toMatch(/spiked to 180/);
  });

  it('detects a drop well below the baseline', async () => {
    const s = mkSentinel();
    await s.push(STABLE);
    const found = await s.push([{ value: 20 }]);
    expect(found[0].type).toBe('drop');
    expect(found[0].description).toMatch(/fell to 20/);
  });

  it('stays silent for values within normal variance', async () => {
    const s = mkSentinel();
    await s.push(STABLE);
    expect(await s.push([{ value: 102 }])).toHaveLength(0);
  });

  it('does not alert before minSamples is reached', async () => {
    const s = mkSentinel();
    // Only 4 samples, then a wild value — too early to judge.
    expect(await s.push([{ value: 100 }, { value: 100 }, { value: 100 }, { value: 100 }])).toHaveLength(0);
    expect(await s.push([{ value: 9999 }])).toHaveLength(0);
  });
});

describe('Sentinel — severity filtering', () => {
  it('suppresses findings below alertLevel', async () => {
    // A z just over 3 (info-level) should be filtered when alertLevel='critical'.
    const s = mkSentinel({ alertLevel: 'critical' });
    await s.push(STABLE);
    const found = await s.push([{ value: 105 }]); // ~3.5σ → info/warning, not critical
    expect(found).toHaveLength(0);
  });
});

describe('Sentinel — threshold rules', () => {
  it('fires when a static max is breached, regardless of variance', async () => {
    const s = mkSentinel({ thresholds: [{ column: 'value', max: 150 }] });
    const found = await s.push([{ value: 200 }]); // no window needed
    expect(found.some((f) => f.type === 'threshold')).toBe(true);
    expect(found[0].description).toMatch(/breached the configured maximum/);
  });

  it('fires when a static min is breached', async () => {
    const s = mkSentinel({ thresholds: [{ column: 'value', min: 10, severity: 'critical' }] });
    const found = await s.push([{ value: 5 }]);
    expect(found[0].type).toBe('threshold');
    expect(found[0].severity).toBe('critical');
  });
});

describe('Sentinel — new categories', () => {
  it('flags a categorical value not seen before', async () => {
    const s = mkSentinel({
      numericColumns: [],
      categoricalColumns: ['region'],
      detectNewCategories: true,
    });
    await s.push([{ region: 'NA' }, { region: 'EU' }]);
    const found = await s.push([{ region: 'APAC' }]);
    expect(found).toHaveLength(1);
    expect(found[0].type).toBe('new-category');
    expect(found[0].value).toBe('APAC');
  });
});

describe('Sentinel — flatline', () => {
  it('flags a feed that has gone completely flat for a full window', async () => {
    const s = mkSentinel({ windowSize: 8, minSamples: 8 });
    // 8 identical readings fill the window; the 9th (still flat) triggers flatline.
    const flat = Array.from({ length: 9 }, () => ({ value: 50 }));
    const found = await s.push(flat);
    expect(found.some((f) => f.type === 'flatline')).toBe(true);
  });
});

describe('Sentinel — webhook + enrichment', () => {
  it('POSTs a Slack-compatible payload to the webhook', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const s = mkSentinel({ webhookUrl: 'https://hooks.slack.com/x', fetchImpl });
    await s.push(STABLE);
    await s.push([{ value: 180 }]);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const body = JSON.parse(String((fetchImpl.mock.calls[0][1] as RequestInit).body));
    expect(body.text).toMatch(/\[CRITICAL\] value spike/);
    expect(body.finding.type).toBe('spike');
  });

  it('replaces the description via the enrich hook', async () => {
    const enrich = vi.fn(async (f: Finding) => `AI: ${f.column} looks anomalous, investigate the upstream feed.`);
    const s = mkSentinel({ enrich });
    await s.push(STABLE);
    const found = await s.push([{ value: 180 }]);
    expect(enrich).toHaveBeenCalledOnce();
    expect(found[0].description).toMatch(/^AI: value looks anomalous/);
  });

  it('keeps monitoring when the webhook fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const onFinding = vi.fn();
    const s = mkSentinel({ webhookUrl: 'https://x', fetchImpl, onFinding });
    await s.push(STABLE);
    const found = await s.push([{ value: 180 }]);
    expect(found).toHaveLength(1);        // still emitted
    expect(onFinding).toHaveBeenCalledOnce();
  });
});

describe('Sentinel — lifecycle', () => {
  it('accumulates findings and reset() clears them', async () => {
    const s = mkSentinel();
    await s.push(STABLE);
    await s.push([{ value: 180 }]);
    expect(s.findings.length).toBe(1);
    s.reset();
    expect(s.findings.length).toBe(0);
  });
});
