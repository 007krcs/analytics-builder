/**
 * CrossFilterProvider — React context that wraps the CrossFilterEngine.
 */

import { createContext, useContext, useMemo } from 'react';
import { CrossFilterEngine } from '../crossfilter-engine.js';

interface CrossFilterContextValue {
  engine: CrossFilterEngine;
}

const CrossFilterContext = createContext<CrossFilterContextValue | null>(null);

export interface CrossFilterProviderProps {
  /** Optionally provide a custom engine instance; defaults to a new one per provider */
  engine?: CrossFilterEngine;
  children: React.ReactNode;
}

export function CrossFilterProvider({ engine: propEngine, children }: CrossFilterProviderProps) {
  // Create a stable engine per provider if not supplied
  const engine = useMemo(
    () => propEngine ?? new CrossFilterEngine(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [propEngine]
  );

  const value = useMemo(() => ({ engine }), [engine]);

  return (
    <CrossFilterContext.Provider value={value}>
      {children}
    </CrossFilterContext.Provider>
  );
}

/** Internal: get engine from context (throws if used outside provider) */
export function useCrossFilterEngine(): CrossFilterEngine {
  const ctx = useContext(CrossFilterContext);
  if (!ctx) {
    throw new Error('useCrossFilter must be used inside a <CrossFilterProvider>');
  }
  return ctx.engine;
}
