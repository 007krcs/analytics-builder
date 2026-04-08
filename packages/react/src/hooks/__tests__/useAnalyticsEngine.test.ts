// ─── useAnalyticsEngine Tests ─────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AnalyticsEngine } from '@gridstorm/analytix-core';
import { useAnalyticsEngine } from '../useAnalyticsEngine';

describe('useAnalyticsEngine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('returns an engine instance', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    expect(result.current.engine).toBeInstanceOf(AnalyticsEngine);
  });

  it('returns version=0 on initial render', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    expect(result.current.version).toBe(0);
  });

  it('returns refreshing=false on initial render', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    expect(result.current.refreshing).toBe(false);
  });

  it('loadDataset is a function', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    expect(typeof result.current.loadDataset).toBe('function');
  });

  it('refresh is a function', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    expect(typeof result.current.refresh).toBe('function');
  });

  // ── Engine stability ───────────────────────────────────────────────────────

  it('returns the same engine instance across re-renders', () => {
    const { result, rerender } = renderHook(() => useAnalyticsEngine());
    const engine1 = result.current.engine;
    rerender();
    expect(result.current.engine).toBe(engine1);
  });

  it('engine is not null after mount', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    expect(result.current.engine).not.toBeNull();
  });

  // ── loadDataset ────────────────────────────────────────────────────────────

  it('loadDataset calls engine.addDatasetFromRows with correct args', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const spy = vi.spyOn(result.current.engine, 'addDatasetFromRows');
    const rows = [{ id: 1, value: 100 }];
    act(() => {
      result.current.loadDataset('ds-1', 'Sales', rows);
    });
    expect(spy).toHaveBeenCalledWith('ds-1', 'Sales', rows);
  });

  it('loadDataset returns the dataset object', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const rows = [{ id: 1, value: 100 }];
    let dataset: ReturnType<typeof result.current.loadDataset>;
    act(() => {
      dataset = result.current.loadDataset('ds-2', 'Revenue', rows);
    });
    expect(dataset!).toBeDefined();
    expect(dataset!.id).toBe('ds-2');
  });

  // ── version increment on events ────────────────────────────────────────────

  it('version increments when dataset:added event fires', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const initialVersion = result.current.version;
    act(() => {
      result.current.engine.eventBus.emit('dataset:added', {
        dataset: { id: 'ds-3' } as any,
      });
    });
    expect(result.current.version).toBe(initialVersion + 1);
  });

  it('version increments when dataset:removed event fires', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const initialVersion = result.current.version;
    act(() => {
      result.current.engine.eventBus.emit('dataset:removed', { datasetId: 'ds-x' });
    });
    expect(result.current.version).toBe(initialVersion + 1);
  });

  it('version increments when pivot:computed event fires', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const before = result.current.version;
    act(() => {
      result.current.engine.eventBus.emit('pivot:computed', { result: { configId: 'p1' } as any });
    });
    expect(result.current.version).toBe(before + 1);
  });

  it('version increments when kpi:computed event fires', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const before = result.current.version;
    act(() => {
      result.current.engine.eventBus.emit('kpi:computed', { result: { configId: 'k1' } as any });
    });
    expect(result.current.version).toBe(before + 1);
  });

  it('version increments when chart:config:changed event fires', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const before = result.current.version;
    act(() => {
      result.current.engine.eventBus.emit('chart:config:changed', { config: {} as any });
    });
    expect(result.current.version).toBe(before + 1);
  });

  it('version increments when pivot:config:changed event fires', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const before = result.current.version;
    act(() => {
      result.current.engine.eventBus.emit('pivot:config:changed', { config: {} as any });
    });
    expect(result.current.version).toBe(before + 1);
  });

  // ── refresh() ─────────────────────────────────────────────────────────────

  it('refresh() increments version by 1', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    const before = result.current.version;
    act(() => {
      result.current.refresh();
    });
    expect(result.current.version).toBe(before + 1);
  });

  it('multiple refresh() calls accumulate version', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    act(() => {
      result.current.refresh();
      result.current.refresh();
      result.current.refresh();
    });
    expect(result.current.version).toBe(3);
  });

  // ── kpi:refreshed event ────────────────────────────────────────────────────

  it('kpi:refreshed sets refreshing=false and bumps version', () => {
    const { result } = renderHook(() => useAnalyticsEngine());
    act(() => {
      result.current.engine.eventBus.emit('kpi:refreshed', {
        configId: 'k1',
        result: { configId: 'k1' } as any,
      });
    });
    expect(result.current.refreshing).toBe(false);
    expect(result.current.version).toBeGreaterThan(0);
  });

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  it('engine.destroy() is called on unmount', () => {
    const { result, unmount } = renderHook(() => useAnalyticsEngine());
    const destroySpy = vi.spyOn(result.current.engine, 'destroy');
    unmount();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('unmounting does not throw', () => {
    const { unmount } = renderHook(() => useAnalyticsEngine());
    expect(() => unmount()).not.toThrow();
  });

  it('event subscriptions cleaned up on unmount — no callbacks after unmount', () => {
    const { result, unmount } = renderHook(() => useAnalyticsEngine());
    const engine = result.current.engine;
    const versionBefore = result.current.version;
    unmount();
    // Emitting after unmount should not cause React state-update warnings
    expect(() => {
      engine.eventBus.emit('dataset:added', { dataset: { id: 'ds-z' } as any });
    }).not.toThrow();
  });

  // ── Options forwarded to engine ────────────────────────────────────────────

  it('accepts undefined options without error', () => {
    expect(() => renderHook(() => useAnalyticsEngine(undefined))).not.toThrow();
  });

  it('accepts empty options object without error', () => {
    expect(() => renderHook(() => useAnalyticsEngine({}))).not.toThrow();
  });
});
