/**
 * usePivot — React hook for computing and subscribing to a pivot table result.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyticsEngine, PivotConfig, PivotResult } from '@gridstorm/analytix-core';

export interface UsePivotResult {
  result: PivotResult | null;
  loading: boolean;
  error: Error | null;
  recompute: () => void;
}

/**
 * Computes a pivot table from the given config and re-runs whenever the config
 * changes. Returns the result, loading state, and any error.
 */
export function usePivot(
  engine: AnalyticsEngine,
  config: PivotConfig | null
): UsePivotResult {
  const [result, setResult] = useState<PivotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const computeRef = useRef<() => void>(() => {});

  const compute = useCallback(() => {
    if (!config) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Register config if not already registered
      engine.addPivotConfig(config);
      const r = engine.computePivot(config.id, true);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [engine, config]);

  computeRef.current = compute;

  // Run on config change
  useEffect(() => {
    computeRef.current();
  }, [config?.id, JSON.stringify(config)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to pivot:computed events for this config
  useEffect(() => {
    if (!config) return;
    const unsub = engine.eventBus.on('pivot:computed', ({ result: r }) => {
      if (r.configId === config.id) setResult(r);
    });
    const unsubErr = engine.eventBus.on('pivot:error', ({ configId, error: e }) => {
      if (configId === config.id) setError(e);
    });
    return () => { unsub(); unsubErr(); };
  }, [engine, config?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const recompute = useCallback(() => computeRef.current(), []);

  return { result, loading, error, recompute };
}
