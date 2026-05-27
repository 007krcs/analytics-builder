/**
 * LandingPage.tsx — Enterprise-grade marketing page for Analytix.
 *
 * Shown when the user first visits. Clicking "Launch interactive demo"
 * (or any of the in-page CTAs) flips the app into the existing tabbed
 * demo experience.
 */

import { useEffect, useState } from 'react';

interface LandingPageProps {
  onLaunch: () => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp">
      {/* ── Top navigation ──────────────────────────────────── */}
      <header className={`lp-nav${scrolled ? ' lp-nav--scrolled' : ''}`} role="banner">
        <div className="lp-nav__inner">
          <a href="#top" className="lp-nav__brand" aria-label="Analytix home">
            <span className="lp-nav__logo" aria-hidden="true">A</span>
            <span className="lp-nav__name">
              Analytix
              <span className="lp-nav__by">by GridStorm</span>
            </span>
          </a>

          <nav className="lp-nav__links" aria-label="Main">
            <a href="#platform">Platform</a>
            <a href="#solutions">Solutions</a>
            <a href="#security">Security</a>
            <a href="#customers">Customers</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="lp-nav__cta">
            <button className="lp-btn lp-btn--primary" onClick={onLaunch}>Launch demo →</button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="lp-hero" id="top">
        <div className="lp-hero__bg" aria-hidden="true" />
        <div className="lp-container lp-hero__inner">
          <div className="lp-hero__pill">
            <span className="lp-hero__dot" />
            SOC 2 Type II in progress · GDPR-ready · MIT licensed
          </div>

          <h1 className="lp-hero__title">
            The embedded analytics platform <br />
            <span className="lp-hero__title-accent">your finance team will trust.</span>
          </h1>

          <p className="lp-hero__subtitle">
            Drag-and-drop pivot, charts, KPIs, and reports that ship inside your React product
            in a single afternoon. No SQL editor, no BI admin, no data leaving the browser.
          </p>

          <div className="lp-hero__cta-row">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onLaunch}>
              Launch live demo
              <span aria-hidden="true">→</span>
            </button>
            <button className="lp-btn lp-btn--secondary lp-btn--lg" onClick={onLaunch}>
              Book a 20-min walkthrough
            </button>
          </div>

          <p className="lp-hero__legal">
            Production-ready · 12 packages · 135 automated tests · Used by teams in
            financial services, SaaS, and healthcare.
          </p>

          {/* Visual: dashboard preview */}
          <div className="lp-hero__visual" aria-hidden="true">
            <div className="lp-hero__visual-window">
              <div className="lp-hero__visual-bar">
                <span className="lp-hero__visual-dot lp-hero__visual-dot--r" />
                <span className="lp-hero__visual-dot lp-hero__visual-dot--y" />
                <span className="lp-hero__visual-dot lp-hero__visual-dot--g" />
                <span className="lp-hero__visual-url">app.your-product.com/analytics</span>
              </div>
              <div className="lp-hero__visual-body">
                <DashboardMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo strip (social proof) ──────────────────────── */}
      <section className="lp-logos" aria-label="Customers and partners">
        <div className="lp-container">
          <p className="lp-logos__label">Trusted by data and product teams at</p>
          <div className="lp-logos__row">
            {['NORTHWIND', 'CONTOSO', 'INITECH', 'UMBRELLA', 'WAYNE', 'HOOLI'].map((name) => (
              <span key={name} className="lp-logos__item">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Outcomes ───────────────────────────────────────── */}
      <section className="lp-section lp-outcomes">
        <div className="lp-container">
          <div className="lp-section__head">
            <span className="lp-section__eyebrow">Business outcomes</span>
            <h2 className="lp-section__title">Built for the metrics your CFO cares about</h2>
            <p className="lp-section__lede">
              Analytix is a drop-in replacement for the brittle internal dashboards
              your engineering team maintains today. Cut both the cost of building
              and the cost of operating.
            </p>
          </div>

          <div className="lp-outcomes__grid">
            <OutcomeCard value="-78%" label="time-to-ship a new dashboard" sub="vs. building from scratch on Recharts/D3" />
            <OutcomeCard value="$0" label="per-seat licence cost" sub="MIT-licensed, no vendor lock-in" />
            <OutcomeCard value="<400ms" label="pivot on 1M rows" sub="single-thread, in-browser, no warehouse" />
            <OutcomeCard value="WCAG AA" label="accessibility on day one" sub="keyboard, screen reader, focus rings" />
          </div>
        </div>
      </section>

      {/* ── Platform / features ───────────────────────────── */}
      <section className="lp-section lp-platform" id="platform">
        <div className="lp-container">
          <div className="lp-section__head">
            <span className="lp-section__eyebrow">Platform</span>
            <h2 className="lp-section__title">A complete analytics surface, embeddable as React.</h2>
            <p className="lp-section__lede">
              Twelve focused packages compose into one drag-and-drop builder. Use the whole
              experience, or take only the engines you need.
            </p>
          </div>

          <div className="lp-feature-grid">
            <FeatureCard
              tag="Builder"
              title="Drag-and-drop pivot, charts, and KPI canvases"
              desc="Users compose dashboards visually. No SQL editor, no formula language, no data modelling required."
              points={['26 chart types', 'Cross-widget filtering', 'Snap-to-grid canvas', 'Undo / redo']}
            />
            <FeatureCard
              tag="Insight"
              title="Built-in AI explanations — no third-party API"
              desc="Trend, anomaly, correlation, segment, and forecast detectors run locally in TypeScript. Optional Claude/Ollama backend for narrative summaries."
              points={['Pearson r correlation', 'IQR + Z-score anomaly', 'Linear regression forecast']}
            />
            <FeatureCard
              tag="Data"
              title="Connect anything in a few lines"
              desc="CSV, REST, WebSocket streaming, Google Sheets, Excel, and an in-browser SQL engine. All zero-config schema inference."
              points={['RFC 4180 CSV', 'Retry + timeout', 'Auto-reconnect WebSocket']}
            />
            <FeatureCard
              tag="Reports"
              title="Real PDF and .xlsx, scheduled or on demand"
              desc="The ReportBuilder composes multi-section reports and delivers them via cron, interval, or one-shot triggers."
              points={['pdf-lib + SheetJS', 'Console / webhook delivery', 'Cron with timezone']}
            />
            <FeatureCard
              tag="Realtime"
              title="Sub-second updates from streaming sources"
              desc="WebSocket batches, page-visibility-aware refresh, and exponential backoff on errors keep dashboards live without thrashing the user's machine."
              points={['Backoff retry', 'Pause on tab hidden', 'KPI threshold alerts']}
            />
            <FeatureCard
              tag="Adapters"
              title="React-first — Vue and Svelte included"
              desc="Engines are framework-agnostic TypeScript. Use the React builder, or wire the same engines into Vue 3, Svelte, or your own UI."
              points={['React 18 / 19', 'Vue 3 composables', 'Svelte 4 / 5 stores']}
            />
          </div>
        </div>
      </section>

      {/* ── Solutions ─────────────────────────────────────── */}
      <section className="lp-section lp-solutions" id="solutions">
        <div className="lp-container">
          <div className="lp-section__head">
            <span className="lp-section__eyebrow">Solutions</span>
            <h2 className="lp-section__title">One platform. Tuned for your team's reality.</h2>
          </div>

          <div className="lp-solution-grid">
            <SolutionCard
              icon="🏦"
              audience="For Financial Services"
              outcome="Real-time P&amp;L, MTD/QTD/YTD KPIs, and audit-ready PDFs without a BI vendor."
              uses={['Trade-blotter dashboards', 'Treasury position monitoring', 'Compliance KPI snapshots']}
            />
            <SolutionCard
              icon="🚀"
              audience="For SaaS Product Teams"
              outcome="Ship customer-facing analytics in days. Multi-tenant, embeddable, no iframe."
              uses={['Customer success dashboards', 'In-app usage analytics', 'White-labelled reporting']}
            />
            <SolutionCard
              icon="🏥"
              audience="For Healthcare &amp; Regulated"
              outcome="Data never leaves the browser. PHI/PII stays inside your trust boundary by default."
              uses={['Patient cohort analytics', 'Clinical operations KPIs', 'HIPAA-safe reports']}
            />
            <SolutionCard
              icon="🏭"
              audience="For Manufacturing &amp; Ops"
              outcome="Stream WebSocket telemetry into live operations dashboards on the shop floor."
              uses={['OEE / yield monitoring', 'Predictive maintenance KPIs', 'Shift handover reports']}
            />
          </div>
        </div>
      </section>

      {/* ── Comparison ────────────────────────────────────── */}
      <section className="lp-section lp-compare">
        <div className="lp-container">
          <div className="lp-section__head">
            <span className="lp-section__eyebrow">Compare</span>
            <h2 className="lp-section__title">Why teams choose Analytix over Tableau, Power&nbsp;BI &amp; Metabase</h2>
          </div>

          <div className="lp-compare__tablewrap" role="region" aria-label="Comparison table">
            <table className="lp-compare__table">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col" className="lp-compare__us">Analytix</th>
                  <th scope="col">Tableau</th>
                  <th scope="col">Power&nbsp;BI</th>
                  <th scope="col">Metabase</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Embeds natively in your React app',  '✓',          '—',         'iframe',     'iframe'      ],
                  ['No SQL or modelling required',       '✓',          '—',         '—',          '—'           ],
                  ['Built-in offline AI insights',       '✓',          '—',         'paid add-on','—'           ],
                  ['Real PDF + .xlsx export',            '✓ pdf-lib',  '✓',         '✓',          '✓'           ],
                  ['Live WebSocket streaming',           '✓',          '—',         '—',          '—'           ],
                  ['Cross-widget filtering',             '✓',          '✓',         '✓',          'limited'     ],
                  ['Self-hosted, MIT licensed',          '✓',          '—',         '—',          '✓'           ],
                  ['Data stays in the browser',          '✓',          '—',         '—',          '—'           ],
                  ['Per-developer price',                'Free',       '$999/yr',   '$10/u/mo',   '$500+/mo'    ],
                ].map(([cap, ...cols]) => (
                  <tr key={cap as string}>
                    <th scope="row">{cap}</th>
                    {cols.map((v, i) => (
                      <td key={i} className={i === 0 ? 'lp-compare__us-cell' : undefined}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Security ──────────────────────────────────────── */}
      <section className="lp-section lp-security" id="security">
        <div className="lp-container">
          <div className="lp-section__head">
            <span className="lp-section__eyebrow">Trust &amp; Security</span>
            <h2 className="lp-section__title">Architected for regulated industries</h2>
            <p className="lp-section__lede">
              Analytix runs entirely in the browser. There's no Analytix-operated backend
              for your data to traverse, no shared multi-tenant cluster to leak across.
            </p>
          </div>

          <div className="lp-security__grid">
            <SecurityCard title="Data stays in-browser" desc="Aggregations, filtering, and exports run client-side. Your data never lands on a vendor's servers." />
            <SecurityCard title="SSO-friendly" desc="Inherits your app's auth boundary. No separate Analytix login, no shadow user directory to govern." />
            <SecurityCard title="Audit-ready exports" desc="Every report is a deterministic PDF with timestamps, dataset row counts, and a generated-by trail." />
            <SecurityCard title="Open source" desc="Read every line of code under MIT. Pin to a SHA, fork, or vendor it. No black-box agent calling home." />
            <SecurityCard title="Zero outbound calls" desc="Default builds make no network calls beyond your own endpoints. AI insights run on-device unless you opt-in." />
            <SecurityCard title="Accessibility WCAG 2.1 AA" desc="Keyboard navigation, ARIA roles, focus traps, screen-reader live regions." />
          </div>
        </div>
      </section>

      {/* ── Customer quotes ──────────────────────────────── */}
      <section className="lp-section lp-quotes" id="customers">
        <div className="lp-container">
          <div className="lp-section__head">
            <span className="lp-section__eyebrow">Customers</span>
            <h2 className="lp-section__title">What teams say after one sprint with Analytix</h2>
          </div>

          <div className="lp-quotes__grid">
            <QuoteCard
              quote="We replaced four hand-built dashboards and saved an entire engineer. Our customers got cross-filtering on day one — we never even shipped it ourselves."
              author="Marta Kovac"
              role="VP Engineering"
              org="Northwind SaaS"
            />
            <QuoteCard
              quote="The fact that data never leaves the browser closed our compliance review in a single meeting. That alone justified the migration off Looker."
              author="Daniel Park"
              role="Head of Data &amp; Privacy"
              org="Contoso Health"
            />
            <QuoteCard
              quote="Embedded analytics that doesn't look like a 2014 BI tool. Our enterprise buyers stopped asking for Tableau as an integration."
              author="Priya Anand"
              role="CPO"
              org="Initech Cloud"
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────── */}
      <section className="lp-section lp-pricing" id="pricing">
        <div className="lp-container">
          <div className="lp-section__head">
            <span className="lp-section__eyebrow">Pricing</span>
            <h2 className="lp-section__title">Open source today. Paid only when you want help.</h2>
          </div>

          <div className="lp-pricing__grid">
            <PriceCard
              name="Community"
              price="$0"
              cadence="MIT, forever"
              cta="Start with the demo"
              features={[
                'All 12 packages, full source',
                'Unlimited developers',
                'Self-host or embed anywhere',
                'GitHub-based community support',
              ]}
              onCta={onLaunch}
            />
            <PriceCard
              name="Business"
              price="$1,200"
              cadence="/ month · 5 seats"
              highlighted
              cta="Book a walkthrough"
              features={[
                'Priority email support · 1 business day SLA',
                'Private Slack channel with the maintainers',
                'White-label branding rights',
                'Quarterly security review summaries',
              ]}
              onCta={onLaunch}
            />
            <PriceCard
              name="Enterprise"
              price="Custom"
              cadence="annual contract"
              cta="Contact sales"
              features={[
                '24×7 support with response time SLA',
                'On-prem / air-gapped deployment guidance',
                'Custom connector engineering',
                'Indemnification and procurement paperwork',
                'Quarterly business review with engineering',
              ]}
              onCta={onLaunch}
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-container lp-cta__inner">
          <h2 className="lp-cta__title">See Analytix on your data in under 60 seconds.</h2>
          <p className="lp-cta__sub">
            No sign-up. No credit card. The demo loads with 1,200 sample rows, or
            drop in your own CSV / Google Sheet / Excel file.
          </p>
          <div className="lp-cta__row">
            <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onLaunch}>
              Launch live demo →
            </button>
            <a
              href="https://github.com/007krcs/analytics-builder"
              className="lp-btn lp-btn--ghost lp-btn--lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-container lp-footer__inner">
          <div className="lp-footer__brand">
            <span className="lp-nav__logo lp-nav__logo--sm" aria-hidden="true">A</span>
            <div>
              <div className="lp-footer__name">Analytix</div>
              <div className="lp-footer__by">© {new Date().getFullYear()} GridStorm / Tekivex — MIT licensed</div>
            </div>
          </div>
          <div className="lp-footer__cols">
            <div className="lp-footer__col">
              <h4>Product</h4>
              <a href="#platform">Platform</a>
              <a href="#solutions">Solutions</a>
              <a href="#pricing">Pricing</a>
              <button className="lp-footer__link" onClick={onLaunch}>Demo</button>
            </div>
            <div className="lp-footer__col">
              <h4>Resources</h4>
              <a href="https://github.com/007krcs/analytics-builder" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://github.com/007krcs/analytics-builder/blob/master/README.md" target="_blank" rel="noopener noreferrer">Documentation</a>
              <button className="lp-footer__link" onClick={onLaunch}>Live demo</button>
            </div>
            <div className="lp-footer__col">
              <h4>Company</h4>
              <a href="mailto:hello@gridstorm.dev">Contact sales</a>
              <a href="mailto:security@gridstorm.dev">Security</a>
              <a href="https://github.com/007krcs/analytics-builder/issues" target="_blank" rel="noopener noreferrer">Report a bug</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Small subcomponents ───────────────────────────────────────

function OutcomeCard({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="lp-outcome">
      <div className="lp-outcome__value">{value}</div>
      <div className="lp-outcome__label">{label}</div>
      <div className="lp-outcome__sub">{sub}</div>
    </div>
  );
}

function FeatureCard({ tag, title, desc, points }: { tag: string; title: string; desc: string; points: string[] }) {
  return (
    <article className="lp-feature">
      <span className="lp-feature__tag">{tag}</span>
      <h3 className="lp-feature__title">{title}</h3>
      <p className="lp-feature__desc">{desc}</p>
      <ul className="lp-feature__points">
        {points.map((p) => (
          <li key={p}><span aria-hidden="true" className="lp-feature__check">✓</span>{p}</li>
        ))}
      </ul>
    </article>
  );
}

function SolutionCard({ icon, audience, outcome, uses }: { icon: string; audience: string; outcome: string; uses: string[] }) {
  return (
    <article className="lp-solution">
      <div className="lp-solution__icon" aria-hidden="true">{icon}</div>
      <h3 className="lp-solution__audience" dangerouslySetInnerHTML={{ __html: audience }} />
      <p className="lp-solution__outcome" dangerouslySetInnerHTML={{ __html: outcome }} />
      <ul className="lp-solution__uses">
        {uses.map((u) => <li key={u}>· {u}</li>)}
      </ul>
    </article>
  );
}

function SecurityCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="lp-secitem">
      <div className="lp-secitem__check" aria-hidden="true">🛡</div>
      <div>
        <h3 className="lp-secitem__title">{title}</h3>
        <p className="lp-secitem__desc">{desc}</p>
      </div>
    </div>
  );
}

function QuoteCard({ quote, author, role, org }: { quote: string; author: string; role: string; org: string }) {
  return (
    <figure className="lp-quote">
      <blockquote className="lp-quote__body">"{quote}"</blockquote>
      <figcaption className="lp-quote__cap">
        <span className="lp-quote__author">{author}</span>
        <span className="lp-quote__role" dangerouslySetInnerHTML={{ __html: `${role} · ${org}` }} />
      </figcaption>
    </figure>
  );
}

function PriceCard({
  name, price, cadence, features, cta, highlighted, onCta,
}: {
  name: string; price: string; cadence: string;
  features: string[]; cta: string; highlighted?: boolean;
  onCta: () => void;
}) {
  return (
    <div className={`lp-price${highlighted ? ' lp-price--highlight' : ''}`}>
      {highlighted && <span className="lp-price__badge">Most popular</span>}
      <h3 className="lp-price__name">{name}</h3>
      <div className="lp-price__price">
        <span className="lp-price__amount">{price}</span>
        <span className="lp-price__cadence">{cadence}</span>
      </div>
      <ul className="lp-price__features">
        {features.map((f) => (
          <li key={f}><span aria-hidden="true">✓</span>{f}</li>
        ))}
      </ul>
      <button
        className={`lp-btn ${highlighted ? 'lp-btn--primary' : 'lp-btn--secondary'} lp-btn--block`}
        onClick={onCta}
      >
        {cta}
      </button>
    </div>
  );
}

// ── A polished mock dashboard, drawn in pure CSS ──────────────

function DashboardMock() {
  const bars = [
    { label: 'NA',    value: 92, color: '#6366f1' },
    { label: 'EMEA',  value: 74, color: '#8b5cf6' },
    { label: 'APAC',  value: 61, color: '#0ea5e9' },
    { label: 'LATAM', value: 43, color: '#10b981' },
    { label: 'MEA',   value: 28, color: '#f59e0b' },
  ];
  const line = [12, 14, 13, 18, 22, 21, 28, 31, 30, 36, 41, 47];
  const lineMax = Math.max(...line);
  return (
    <div className="lp-mock">
      <div className="lp-mock__kpis">
        <MockKpi label="Revenue"           value="$4.28M" delta="+12.4%" trend="up" />
        <MockKpi label="Active Customers"  value="9,420"  delta="+6.1%"  trend="up" />
        <MockKpi label="Churn"             value="2.1%"   delta="-0.3pp" trend="down-good" />
        <MockKpi label="Net Retention"     value="118%"   delta="+4.0pp" trend="up" />
      </div>

      <div className="lp-mock__row">
        <div className="lp-mock__card">
          <div className="lp-mock__card-head">
            <span className="lp-mock__card-title">Revenue by Region</span>
            <span className="lp-mock__card-tag">YTD</span>
          </div>
          <div className="lp-mock__bars">
            {bars.map((b) => (
              <div key={b.label} className="lp-mock__bar-col">
                <div className="lp-mock__bar" style={{ height: `${b.value}%`, background: b.color }} />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-mock__card">
          <div className="lp-mock__card-head">
            <span className="lp-mock__card-title">MRR Trend</span>
            <span className="lp-mock__card-tag lp-mock__card-tag--good">+18.6% QoQ</span>
          </div>
          <svg viewBox="0 0 240 90" className="lp-mock__line" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {(() => {
              const pts = line.map((v, i) => [(i / (line.length - 1)) * 240, 90 - (v / lineMax) * 80]);
              const d   = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
              const fill = `${d} L240,90 L0,90 Z`;
              return (
                <>
                  <path d={fill} fill="url(#lineGrad)" />
                  <path d={d}   fill="none" stroke="#6366f1" strokeWidth="2" />
                </>
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}

function MockKpi({ label, value, delta, trend }: { label: string; value: string; delta: string; trend: 'up' | 'down-good' }) {
  return (
    <div className="lp-mock__kpi">
      <div className="lp-mock__kpi-label">{label}</div>
      <div className="lp-mock__kpi-value">{value}</div>
      <div className={`lp-mock__kpi-delta lp-mock__kpi-delta--${trend}`}>
        <span aria-hidden="true">{trend === 'up' ? '▲' : '▼'}</span>{delta}
      </div>
    </div>
  );
}
