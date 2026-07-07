// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * useAnalyticsEngine — React hook that creates and manages a single
 * AnalyticsEngine instance for the lifetime of the component tree.
 *
 * Use this at the root of your analytics builder to get an engine
 * pre-wired with all specialized sub-engines.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import type { AnalyticsEngineOptions, Dataset, Row } from '@gridstorm/analytix-core';
import { computePivot } from '@gridstorm/analytix-pivot-engine';
import { computeKpi } from '@gridstorm/analytix-kpi-engine';

export interface UseAnalyticsEngineResult {
  engine: AnalyticsEngine;
  /** Load a dataset from rows */
  loadDataset: (id: string, name: string, rows: Row[]) => Dataset;
  /** Whether any KPI is currently refreshing */
  refreshing: boolean;
  /** Force re-render counter (increment to trigger re-renders) */
  version: number;
  /** Manually bump version to force re-render */
  refresh: () => void;
}

/**
 * Creates and returns a stable AnalyticsEngine instance wired with
 * pivot, chart, and KPI engines. The engine is destroyed on unmount.
 */
export function useAnalyticsEngine(
  options?: AnalyticsEngineOptions
): UseAnalyticsEngineResult {
  const engineRef = useRef<AnalyticsEngine | null>(null);
  const optionsRef = useRef(options);
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Lazy factory. React 18 StrictMode (dev) unmounts and remounts effects
  // WITHOUT re-rendering: our unmount cleanup destroys the engine, then
  // effects re-run against the render-phase closure. Anything that grabs the
  // engine must therefore go through this factory, which revives a destroyed
  // instance on demand instead of handing back a dead one (the old behaviour
  // threw "AnalyticsEngine has been destroyed" and blank-paged every dev run).
  const getEngine = useCallback((): AnalyticsEngine => {
    if (!engineRef.current) {
      const e = new AnalyticsEngine(optionsRef.current);
      e.registerPivotEngine(computePivot);
      e.registerKpiEngine(computeKpi);
      engineRef.current = e;
    }
    return engineRef.current;
  }, []);

  const engine = getEngine();

  // Subscribe to events to trigger re-renders
  useEffect(() => {
    const live = getEngine();
    const unsubs = [
      live.eventBus.on('dataset:added', () => setVersion((v) => v + 1)),
      live.eventBus.on('dataset:removed', () => setVersion((v) => v + 1)),
      live.eventBus.on('pivot:computed', () => setVersion((v) => v + 1)),
      live.eventBus.on('kpi:computed', () => setVersion((v) => v + 1)),
      live.eventBus.on('kpi:refreshed', () => {
        setRefreshing(false);
        setVersion((v) => v + 1);
      }),
      live.eventBus.on('chart:config:changed', () => setVersion((v) => v + 1)),
      live.eventBus.on('pivot:config:changed', () => setVersion((v) => v + 1)),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [engine, getEngine]);

  // Cleanup on unmount (and StrictMode revive on dev remount)
  useEffect(() => {
    // On a StrictMode remount the cleanup below already destroyed the
    // render-phase instance. Revive and re-render so every consumer of
    // `engine` picks up the live replacement.
    if (getEngine() !== engine) setVersion((v) => v + 1);
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDataset = useCallback(
    (id: string, name: string, rows: Row[]): Dataset => {
      return getEngine().addDatasetFromRows(id, name, rows);
    },
    [getEngine]
  );

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { engine, loadDataset, refreshing, version, refresh };
}
