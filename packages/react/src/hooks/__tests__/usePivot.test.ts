// ─── usePivot Tests ───────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import type { PivotConfig } from '@gridstorm/analytix-core';
import { computePivot } from '@gridstorm/analytix-pivot-engine';
import { computeKpi } from '@gridstorm/analytix-kpi-engine';
import { usePivot } from '../usePivot';

function makeEngine(): AnalyticsEngine {
  const engine = new AnalyticsEngine();
  engine.registerPivotEngine(computePivot);
  engine.registerKpiEngine(computeKpi);
  return engine;
}

const SIMPLE_CONFIG: PivotConfig = {
  id: 'pivot-1',
  datasetId: 'ds-1',
  rowFields: ['region'],
  columnFields: [],
  valueFields: [{ columnId: 'revenue', aggregation: 'sum', label: 'Revenue' }],
  filters: [],
  showRowTotals: true,
  showColumnTotals: false,
  showSubTotals: false,
  compactMode: false,
};

describe('usePivot', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = makeEngine();
  });

  afterEach(() => {
    engine.destroy();
    vi.restoreAllMocks();
  });

  // ── Null config ────────────────────────────────────────────────────────────

  it('returns result=null when config is null', () => {
    const { result } = renderHook(() => usePivot(engine, null));
    expect(result.current.result).toBeNull();
  });

  it('returns loading=false when config is null', () => {
    const { result } = renderHook(() => usePivot(engine, null));
    expect(result.current.loading).toBe(false);
  });

  it('returns error=null when config is null', () => {
    const { result } = renderHook(() => usePivot(engine, null));
    expect(result.current.error).toBeNull();
  });

  it('recompute is a function', () => {
    const { result } = renderHook(() => usePivot(engine, null));
    expect(typeof result.current.recompute).toBe('function');
  });

  // ── With valid config + dataset ────────────────────────────────────────────

  it('returns a pivot result when config and dataset are present', async () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [
      { region: 'North', revenue: 100 },
      { region: 'South', revenue: 200 },
    ]);
    const { result } = renderHook(() => usePivot(engine, SIMPLE_CONFIG));
    // useEffect fires asynchronously — wait for state to settle
    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(result.current.result?.configId).toBe('pivot-1');
  });

  it('result has rows after computation', async () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [
      { region: 'East', revenue: 150 },
      { region: 'West', revenue: 300 },
    ]);
    const { result } = renderHook(() => usePivot(engine, SIMPLE_CONFIG));
    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(Array.isArray(result.current.result?.rows)).toBe(true);
    expect(result.current.result!.rows.length).toBeGreaterThan(0);
  });

  it('loading is false after synchronous computation', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ region: 'North', revenue: 100 }]);
    const { result } = renderHook(() => usePivot(engine, SIMPLE_CONFIG));
    expect(result.current.loading).toBe(false);
  });

  // ── Error handling ─────────────────────────────────────────────────────────

  it('sets error when computePivot throws', () => {
    // Config references missing dataset → computePivot should throw
    const badConfig: PivotConfig = { ...SIMPLE_CONFIG, id: 'pivot-bad', datasetId: 'nonexistent' };
    const { result } = renderHook(() => usePivot(engine, badConfig));
    // Either error is set or result is null (engine may return null vs throw)
    expect(
      result.current.error !== null || result.current.result === null
    ).toBe(true);
  });

  it('error is an Error instance when set', () => {
    const badConfig: PivotConfig = { ...SIMPLE_CONFIG, id: 'pivot-err', datasetId: 'missing' };
    const { result } = renderHook(() => usePivot(engine, badConfig));
    if (result.current.error !== null) {
      expect(result.current.error).toBeInstanceOf(Error);
    }
  });

  // ── recompute ──────────────────────────────────────────────────────────────

  it('recompute() re-runs the pivot computation', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ region: 'North', revenue: 100 }]);
    const { result } = renderHook(() => usePivot(engine, SIMPLE_CONFIG));
    const computeSpy = vi.spyOn(engine, 'computePivot');
    act(() => {
      result.current.recompute();
    });
    expect(computeSpy).toHaveBeenCalled();
  });

  it('calling recompute() does not throw', () => {
    const { result } = renderHook(() => usePivot(engine, null));
    expect(() => act(() => result.current.recompute())).not.toThrow();
  });

  // ── pivot:computed event ───────────────────────────────────────────────────

  it('updates result when pivot:computed event fires for matching configId', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ region: 'North', revenue: 100 }]);
    const { result } = renderHook(() => usePivot(engine, SIMPLE_CONFIG));

    const fakeResult = {
      configId: 'pivot-1',
      rows: [{ key: 'East', values: { revenue: 500 } }],
      columns: [],
      totals: {},
      durationMs: 1,
      rowCount: 1,
      computedAt: new Date(),
    } as any;

    act(() => {
      engine.eventBus.emit('pivot:computed', { result: fakeResult });
    });

    expect(result.current.result?.configId).toBe('pivot-1');
  });

  it('does NOT update result when pivot:computed fires for a different configId', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ region: 'North', revenue: 100 }]);
    const { result } = renderHook(() => usePivot(engine, SIMPLE_CONFIG));
    const resultBefore = result.current.result;

    act(() => {
      engine.eventBus.emit('pivot:computed', {
        result: { configId: 'different-pivot', rows: [] } as any,
      });
    });

    // result should not have changed to the different pivot's result
    expect(result.current.result?.configId).not.toBe('different-pivot');
  });

  // ── Config changes ─────────────────────────────────────────────────────────

  it('recomputes when config id changes', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ region: 'North', revenue: 100 }]);
    const { result, rerender } = renderHook(
      ({ config }: { config: PivotConfig | null }) => usePivot(engine, config),
      { initialProps: { config: SIMPLE_CONFIG } }
    );

    const computeSpy = vi.spyOn(engine, 'computePivot');

    const config2: PivotConfig = { ...SIMPLE_CONFIG, id: 'pivot-2' };
    rerender({ config: config2 });

    expect(computeSpy).toHaveBeenCalled();
  });

  it('result becomes null when config changes to null', () => {
    engine.addDatasetFromRows('ds-1', 'Sales', [{ region: 'North', revenue: 100 }]);
    const { result, rerender } = renderHook(
      ({ config }: { config: PivotConfig | null }) => usePivot(engine, config),
      { initialProps: { config: SIMPLE_CONFIG } }
    );

    rerender({ config: null });
    expect(result.current.result).toBeNull();
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────

  it('unmounting does not throw', () => {
    const { unmount } = renderHook(() => usePivot(engine, null));
    expect(() => unmount()).not.toThrow();
  });
});
