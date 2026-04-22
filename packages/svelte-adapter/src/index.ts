// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * @gridstorm/analytix-svelte — Svelte stores adapter for Analytics Builder
 *
 * Provides writable/readable stores for KPI results, pivot tables,
 * and engine state — compatible with Svelte 4 and Svelte 5.
 */

import type {
  AnalyticsEngine,
  KpiConfig,
  KpiResult,
  PivotConfig,
  PivotResult,
  EngineState,
} from '@gridstorm/analytix-core';

// ─── Svelte store types (minimal subset) ─────────────────────────────────────
// We avoid importing svelte directly so this package builds in any environment.

/** Svelte Readable store interface */
export interface Readable<T> {
  subscribe(run: (value: T) => void, invalidate?: () => void): () => void;
}

/** Svelte Writable store interface */
export interface Writable<T> extends Readable<T> {
  set(value: T): void;
  update(fn: (value: T) => T): void;
}

// ─── Lightweight store implementation ─────────────────────────────────────────

function writable<T>(initial: T): Writable<T> {
  let value = initial;
  const subscribers = new Set<(val: T) => void>();

  return {
    subscribe(run) {
      subscribers.add(run);
      run(value);
      return () => subscribers.delete(run);
    },
    set(newVal) {
      value = newVal;
      subscribers.forEach((fn) => fn(value));
    },
    update(fn) {
      value = fn(value);
      subscribers.forEach((fn_) => fn_(value));
    },
  };
}

function readable<T>(initial: T, start: (set: (val: T) => void) => () => void): Readable<T> {
  const store = writable(initial);
  let stop: (() => void) | undefined;

  return {
    subscribe(run, invalidate?) {
      const unsubscribe = store.subscribe(run, invalidate);
      if (!stop) {
        stop = start(store.set.bind(store));
      }
      return () => {
        unsubscribe();
        if (stop) {
          stop();
          stop = undefined;
        }
      };
    },
  };
}

// ─── createEngineStore ───────────────────────────────────────────────────────

/**
 * createEngineStore — Readable Svelte store that reflects AnalyticsEngine state.
 *
 * @param engine   AnalyticsEngine instance to observe
 * @returns        Readable<EngineState> Svelte store
 *
 * @example
 * ```svelte
 * <script>
 *   import { createEngineStore } from '@gridstorm/analytix-svelte'
 *   const state = createEngineStore(engine)
 * </script>
 * <p>Datasets: {$state.datasets.length}</p>
 * ```
 */
export function createEngineStore(engine: AnalyticsEngine): Readable<EngineState> {
  return readable<EngineState>(
    engine.exportState(),
    (set) => {
      const update = () => set(engine.exportState());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub1 = (engine.eventBus.on as any)('dataset:updated', update);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub2 = (engine.eventBus.on as any)('dataset:added', update);
      return () => {
        if (typeof unsub1 === 'function') unsub1();
        if (typeof unsub2 === 'function') unsub2();
      };
    }
  );
}

// ─── createKpiStore ──────────────────────────────────────────────────────────

/**
 * createKpiStore — Readable Svelte store that computes a KPI result reactively.
 *
 * Re-runs whenever the underlying dataset changes.
 *
 * @param engine   AnalyticsEngine instance
 * @param config   KPI configuration
 * @returns        Readable<KpiResult | null> Svelte store
 *
 * @example
 * ```svelte
 * <script>
 *   import { createKpiStore } from '@gridstorm/analytix-svelte'
 *   const revenue = createKpiStore(engine, kpiConfig)
 * </script>
 * <div>{$revenue?.formatted ?? 'Loading…'}</div>
 * ```
 */
export function createKpiStore(
  engine: AnalyticsEngine,
  config: KpiConfig
): Readable<KpiResult | null> {
  return readable<KpiResult | null>(
    null,
    (set) => {
      let cancelled = false;

      const compute = () => {
        try {
          // Register config if not already present, then compute
          engine.addKpiConfig(config);
          const result = engine.computeKpi(config.id, true);
          if (!cancelled) set(result);
        } catch {
          if (!cancelled) set(null);
        }
      };

      compute();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub1 = (engine.eventBus.on as any)('dataset:updated', compute);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub2 = (engine.eventBus.on as any)('dataset:added', compute);

      return () => {
        cancelled = true;
        if (typeof unsub1 === 'function') unsub1();
        if (typeof unsub2 === 'function') unsub2();
      };
    }
  );
}

// ─── createPivotStore ────────────────────────────────────────────────────────

/**
 * createPivotStore — Readable Svelte store that computes a pivot table reactively.
 *
 * @param engine   AnalyticsEngine instance
 * @param config   Pivot configuration
 * @returns        Readable<PivotResult | null> Svelte store
 *
 * @example
 * ```svelte
 * <script>
 *   import { createPivotStore } from '@gridstorm/analytix-svelte'
 *   const pivot = createPivotStore(engine, pivotConfig)
 * </script>
 * ```
 */
export function createPivotStore(
  engine: AnalyticsEngine,
  config: PivotConfig
): Readable<PivotResult | null> {
  return readable<PivotResult | null>(
    null,
    (set) => {
      let cancelled = false;

      const compute = () => {
        try {
          engine.addPivotConfig(config);
          const result = engine.computePivot(config.id, true);
          if (!cancelled) set(result);
        } catch {
          if (!cancelled) set(null);
        }
      };

      compute();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub1 = (engine.eventBus.on as any)('dataset:updated', compute);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub2 = (engine.eventBus.on as any)('dataset:added', compute);

      return () => {
        cancelled = true;
        if (typeof unsub1 === 'function') unsub1();
        if (typeof unsub2 === 'function') unsub2();
      };
    }
  );
}

// ─── README ───────────────────────────────────────────────────────────────────

export const SVELTE_ADAPTER_README = `
# @gridstorm/analytix-svelte

Svelte stores adapter for Analytics Builder. Compatible with Svelte 4 and Svelte 5.

## Installation

\`\`\`bash
pnpm add @gridstorm/analytix-svelte @gridstorm/analytix-core svelte
\`\`\`

## Usage

\`\`\`svelte
<script lang="ts">
  import { AnalyticsEngine, buildDataset } from '@gridstorm/analytix-core'
  import { createKpiStore, createPivotStore, createEngineStore } from '@gridstorm/analytix-svelte'

  const engine = new AnalyticsEngine()

  // Reactive KPI
  const revenue = createKpiStore(engine, {
    id: 'rev', title: 'Revenue', datasetId: 'sales',
    columnId: 'revenue', aggregation: 'sum', filters: [],
    decimals: 0, refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true }
  })

  // Reactive engine state
  const state = createEngineStore(engine)
</script>

<p>Revenue: {$revenue?.formatted ?? 'Loading…'}</p>
<p>Datasets: {$state.datasets.length}</p>
\`\`\`

## API

### createEngineStore(engine) → Readable<EngineState>

Reflects the full engine state. Updates whenever datasets change.

### createKpiStore(engine, config) → Readable<KpiResult | null>

Reactive KPI result. Re-computes on dataset changes.

### createPivotStore(engine, config) → Readable<PivotResult | null>

Reactive pivot table. Re-computes on dataset changes.
`;
