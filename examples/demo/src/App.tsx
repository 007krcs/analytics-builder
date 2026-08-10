/**
 * App.tsx — view router.
 *
 * The marketing landing page is the default and ships as a light chunk.
 * The full studio (analytics engine, dnd-kit, recharts, all 14 tabs) lives
 * in DemoShell.tsx and is lazy-loaded the first time the user launches it —
 * so first paint of the landing page never pays for the studio bundle.
 *
 * Hash routing: '#demo' (optionally '#demo?q=…') deep-links into the studio.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import LandingPage from './LandingPage.js';
import './styles.css';

const DemoShell = lazy(() => import('./DemoShell.js'));

type View = 'landing' | 'app';

export default function App() {
  const initialView: View =
    typeof window !== 'undefined' && /^#(demo|app)/.test(window.location.hash)
      ? 'app'
      : 'landing';

  const [view, setView] = useState<View>(initialView);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Keep '#demo?q=…' deep links intact — only normalise when actually wrong.
    if (view === 'app') {
      if (!window.location.hash.startsWith('#demo')) {
        window.history.replaceState(null, '', `${window.location.pathname}#demo`);
      }
    } else if (window.location.hash !== '') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [view]);

  if (view === 'landing') {
    return <LandingPage onLaunch={() => { setView('app'); window.scrollTo({ top: 0 }); }} />;
  }

  return (
    <Suspense
      fallback={
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', color: '#64748b', fontSize: 15 }}>
          Loading the studio…
        </div>
      }
    >
      <DemoShell onBack={() => { setView('landing'); window.scrollTo({ top: 0 }); }} />
    </Suspense>
  );
}
