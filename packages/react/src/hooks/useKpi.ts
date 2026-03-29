/**
 * useKpi — React hook for computing a KPI with optional auto-refresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyticsEngine, KpiConfig, KpiResult } from '@analytix/core';
import { refreshScheduler } from '@analytix/kpi-engine';

export interface UseKpiResult {
  result: KpiResult | null;
  loading: boolean;
  error: Error | null;
  recompute: () => void;
}

/**
 * Computes a KPI and optionally auto-refreshes on the configured schedule.
 */
export function useKpi(
  engine: AnalyticsEngine,
  config: KpiConfig | null
): UseKpiResult {
  const [result, setResult] = useState<KpiResult | null>(null);
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
      engine.addKpiConfig(config);
      const r = engine.computeKpi(config.id, true);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [engine, config]);

  computeRef.current = compute;

  // Initial compute on mount / config change
  useEffect(() => {
    computeRef.current();
  }, [config?.id, JSON.stringify(config)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to KPI events
  useEffect(() => {
    if (!config) return;
    const unsub = engine.eventBus.on('kpi:computed', ({ result: r }) => {
      if (r.configId === config.id) setResult(r);
    });
    const unsubErr = engine.eventBus.on('kpi:error', ({ configId, error: e }) => {
      if (configId === config.id) setError(e);
    });
    return () => { unsub(); unsubErr(); };
  }, [engine, config?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up auto-refresh via RefreshScheduler
  useEffect(() => {
    if (!config?.refreshPolicy?.enabled) return;
    const unsub = refreshScheduler.onRefresh((kpiId) => {
      if (kpiId === config.id) computeRef.current();
    });
    refreshScheduler.schedule(config.id, config.refreshPolicy);
    return () => {
      unsub();
      refreshScheduler.stop(config.id);
    };
  }, [config?.id, config?.refreshPolicy]); // eslint-disable-line react-hooks/exhaustive-deps

  const recompute = useCallback(() => computeRef.current(), []);

  return { result, loading, error, recompute };
}

/**
 * useKpiMany — Compute multiple KPIs at once.
 * Returns a map of configId → KpiResult.
 */
export function useKpiMany(
  engine: AnalyticsEngine,
  configs: KpiConfig[]
): Map<string, KpiResult> {
  const [results, setResults] = useState<Map<string, KpiResult>>(new Map());
  const computeRef = useRef<() => void>(() => {});

  const compute = useCallback(() => {
    for (const config of configs) {
      engine.addKpiConfig(config);
    }
    const r = engine.computeAllKpis(true);
    setResults(new Map(r));
  }, [engine, configs]);

  computeRef.current = compute;

  useEffect(() => {
    computeRef.current();
  }, [configs.map((c) => c.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsub = engine.eventBus.on('kpi:computed', () => {
      const r = engine.computeAllKpis();
      setResults(new Map(r));
    });
    return unsub;
  }, [engine]);

  return results;
}
