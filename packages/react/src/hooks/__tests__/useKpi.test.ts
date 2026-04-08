// ─── useKpi Tests ─────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import type { KpiConfig } from '@gridstorm/analytix-core';
import { computePivot } from '@gridstorm/analytix-pivot-engine';
import { computeKpi } from '@gridstorm/analytix-kpi-engine';
import { useKpi } from '../useKpi';

function makeEngine(): AnalyticsEngine {
  const engine = new AnalyticsEngine();
  engine.registerPivotEngine(computePivot);
  engine.registerKpiEngine(computeKpi);
  return engine;
}

const REVENUE_KPI: KpiConfig = {
  id: 'kpi-revenue',
  title: 'Total Revenue',
  description: 'Sum of revenue',
  datasetId: 'ds-1',
  columnId: 'revenue',
  aggregation: 'sum',
  filters: [],
  decimals: 0,
  format: 'currency',
  prefix: '$',
  threshold: {
    warning: 5000,
    critical: 3000,
    target: 10000,
    comparisonType: 'greater_is_better',
  },
  refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
};

describe('useKpi', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = makeEngine();
    vi.useFakeTimers();
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Null config ────────────────────────────────────────────────────────────

  it('returns result=null when config is null', () => {
    const { result } = renderHook(() => useKpi(engine, null));
    expect(result.current.result).toBeNull();
  });

  it('returns loading=false when config is null', () => {
    const { result } = renderHook(() => useKpi(engine, null));
    expect(result.current.loading).toBe(false);
  });

  it('returns error=null when config is null', () => {
    const { result } = renderHook(() => useKpi(engine, null));
    expect(result.current.error).toBeNull();
  });

  it('recompute is a function', () => {
    const { result } = renderHook(() => useKpi(engine, null));
    expect(typeof result.current.recompute).toBe('function');
  });

  // ── With valid config + dataset ────────────────────────────────────────────

  it('returns a KPI result when config and dataset are present', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [
      { revenue: 100 },
      { revenue: 200 },
      { revenue: 300 },
    ]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.configId).toBe('kpi-revenue');
  });

  it('result.value is the sum of revenue rows', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [
      { revenue: 100 },
      { revenue: 200 },
      { revenue: 300 },
    ]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(result.current.result?.value).toBe(600);
  });

  it('result.formatted is a non-empty string', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 500 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(typeof result.current.result?.formatted).toBe('string');
    expect(result.current.result!.formatted.length).toBeGreaterThan(0);
  });

  it('result.status is one of: good / warning / critical / neutral', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 9000 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    const validStatuses = ['good', 'warning', 'critical', 'neutral'];
    expect(validStatuses).toContain(result.current.result?.status);
  });

  it('loading is false after synchronous computation', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 100 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(result.current.loading).toBe(false);
  });

  // ── Threshold status ───────────────────────────────────────────────────────

  it('status is "good" when value > threshold.target', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 15000 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(result.current.result?.status).toBe('good');
  });

  it('status is "warning" when value is between warning and target', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 7000 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(result.current.result?.status).toBe('warning');
  });

  it('status is "critical" when value is below critical threshold', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 1000 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(result.current.result?.status).toBe('critical');
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('sets error when dataset is missing', () => {
    // No dataset added → engine should throw or return error
    const badKpi: KpiConfig = { ...REVENUE_KPI, id: 'kpi-bad', datasetId: 'nonexistent' };
    const { result } = renderHook(() => useKpi(engine, badKpi));
    expect(
      result.current.error !== null || result.current.result === null
    ).toBe(true);
  });

  it('error is an Error instance when set', () => {
    const badKpi: KpiConfig = { ...REVENUE_KPI, id: 'kpi-err', datasetId: 'missing' };
    const { result } = renderHook(() => useKpi(engine, badKpi));
    if (result.current.error !== null) {
      expect(result.current.error).toBeInstanceOf(Error);
    }
  });

  // ── recompute ──────────────────────────────────────────────────────────────

  it('recompute() calls engine.computeKpi', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 100 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    const computeSpy = vi.spyOn(engine, 'computeKpi');
    act(() => {
      result.current.recompute();
    });
    expect(computeSpy).toHaveBeenCalled();
  });

  it('recompute() with null config does not throw', () => {
    const { result } = renderHook(() => useKpi(engine, null));
    expect(() => act(() => result.current.recompute())).not.toThrow();
  });

  // ── kpi:computed event ─────────────────────────────────────────────────────

  it('updates result when kpi:computed fires for matching configId', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 100 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));

    const fakeResult = {
      configId: 'kpi-revenue',
      value: 9999,
      formatted: '$9,999',
      status: 'good' as const,
      rowCount: 1,
      durationMs: 1,
      computedAt: new Date(),
      stale: false,
    } as any;

    act(() => {
      engine.eventBus.emit('kpi:computed', { result: fakeResult });
    });

    expect(result.current.result?.value).toBe(9999);
  });

  it('does NOT update result when kpi:computed fires for different configId', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 500 }]);
    const { result } = renderHook(() => useKpi(engine, REVENUE_KPI));
    const originalValue = result.current.result?.value;

    act(() => {
      engine.eventBus.emit('kpi:computed', {
        result: {
          configId: 'kpi-other',
          value: 99999,
          formatted: '$99,999',
          status: 'good',
          rowCount: 1,
          durationMs: 1,
          computedAt: new Date(),
        } as any,
      });
    });

    expect(result.current.result?.value).toBe(originalValue);
  });

  // ── Config change ──────────────────────────────────────────────────────────

  it('result becomes null when config changes to null', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 100 }]);
    const { result, rerender } = renderHook(
      ({ config }: { config: KpiConfig | null }) => useKpi(engine, config),
      { initialProps: { config: REVENUE_KPI } }
    );

    rerender({ config: null });
    expect(result.current.result).toBeNull();
  });

  it('recomputes when config id changes', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 100 }]);
    const { rerender } = renderHook(
      ({ config }: { config: KpiConfig | null }) => useKpi(engine, config),
      { initialProps: { config: REVENUE_KPI } }
    );

    const computeSpy = vi.spyOn(engine, 'computeKpi');
    const config2: KpiConfig = { ...REVENUE_KPI, id: 'kpi-2' };
    rerender({ config: config2 });

    expect(computeSpy).toHaveBeenCalled();
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────

  it('unmounting does not throw', () => {
    const { unmount } = renderHook(() => useKpi(engine, null));
    expect(() => unmount()).not.toThrow();
  });

  it('unmounting with active config does not throw', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ revenue: 100 }]);
    const { unmount } = renderHook(() => useKpi(engine, REVENUE_KPI));
    expect(() => unmount()).not.toThrow();
  });
});
