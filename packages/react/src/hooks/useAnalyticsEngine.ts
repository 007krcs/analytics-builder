/**
 * useAnalyticsEngine — React hook that creates and manages a single
 * AnalyticsEngine instance for the lifetime of the component tree.
 *
 * Use this at the root of your analytics builder to get an engine
 * pre-wired with all specialized sub-engines.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { AnalyticsEngine } from '@analytix/core';
import type { AnalyticsEngineOptions, Dataset, Row } from '@analytix/core';
import { computePivot } from '@analytix/pivot-engine';
import { computeKpi } from '@analytix/kpi-engine';

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
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Create engine on mount
  if (!engineRef.current) {
    const engine = new AnalyticsEngine(options);
    engine.registerPivotEngine(computePivot);
    engine.registerKpiEngine(computeKpi);
    engineRef.current = engine;
  }

  const engine = engineRef.current;

  // Subscribe to events to trigger re-renders
  useEffect(() => {
    const unsubs = [
      engine.eventBus.on('dataset:added', () => setVersion((v) => v + 1)),
      engine.eventBus.on('dataset:removed', () => setVersion((v) => v + 1)),
      engine.eventBus.on('pivot:computed', () => setVersion((v) => v + 1)),
      engine.eventBus.on('kpi:computed', () => setVersion((v) => v + 1)),
      engine.eventBus.on('kpi:refreshed', () => {
        setRefreshing(false);
        setVersion((v) => v + 1);
      }),
      engine.eventBus.on('chart:config:changed', () => setVersion((v) => v + 1)),
      engine.eventBus.on('pivot:config:changed', () => setVersion((v) => v + 1)),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [engine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const loadDataset = useCallback(
    (id: string, name: string, rows: Row[]): Dataset => {
      return engine.addDatasetFromRows(id, name, rows);
    },
    [engine]
  );

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return { engine, loadDataset, refreshing, version, refresh };
}
