// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * @gridstorm/analytix-vue — Vue 3 composables for Analytics Builder
 *
 * Usage:
 *   import { useAnalyticsEngine, useKpi, usePivot } from '@gridstorm/analytix-vue'
 *
 * This is a type-safe stub using Vue's Composition API. Vue itself is a
 * peerDependency — the composables use type-only imports so this package
 * can be built without Vue installed in the monorepo.
 */

import type { AnalyticsEngine, KpiConfig, KpiResult, PivotConfig, PivotResult } from '@gridstorm/analytix-core';

// ─── Vue type stubs ───────────────────────────────────────────────────────────
// We use `import type` to avoid requiring vue as a real dep during build.
// At runtime (in a Vue app), the real vue module is used via peerDependency.

type Ref<T> = { value: T };
type ComputedRef<T> = Ref<T>;

// Dynamic import of vue at runtime only
async function getVue() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await import('vue' as any)) as {
    ref: <T>(val: T) => Ref<T>;
    computed: <T>(fn: () => T) => ComputedRef<T>;
    onMounted: (fn: () => void) => void;
    onUnmounted: (fn: () => void) => void;
  };
}

// ─── useAnalyticsEngine ──────────────────────────────────────────────────────

/**
 * useAnalyticsEngine — Creates a new AnalyticsEngine instance bound to the
 * Vue component lifecycle. The engine is created once and reused.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAnalyticsEngine } from '@gridstorm/analytix-vue'
 * const { engine } = useAnalyticsEngine()
 * </script>
 * ```
 */
export function useAnalyticsEngine(): { engine: AnalyticsEngine } {
  throw new Error(
    '[stub] useAnalyticsEngine() must be called inside a Vue component setup(). ' +
    'Install @gridstorm/analytix-vue in a Vue 3 project.'
  );
}

// ─── useKpi ──────────────────────────────────────────────────────────────────

/**
 * useKpi — Reactive KPI result derived from an AnalyticsEngine and KpiConfig.
 *
 * @param engine   AnalyticsEngine instance
 * @param config   KPI configuration
 * @returns        Reactive Ref containing the latest KpiResult or null
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAnalyticsEngine, useKpi } from '@gridstorm/analytix-vue'
 * const { engine } = useAnalyticsEngine()
 * const revenue = useKpi(engine, { id: 'rev', datasetId: 'sales', ... })
 * </script>
 * ```
 */
export function useKpi(
  _engine: AnalyticsEngine,
  _config: KpiConfig
): Ref<KpiResult | null> {
  throw new Error(
    '[stub] useKpi() must be called inside a Vue component setup(). ' +
    'Install @gridstorm/analytix-vue in a Vue 3 project.'
  );
}

// ─── usePivot ─────────────────────────────────────────────────────────────────

/**
 * usePivot — Reactive pivot table result.
 *
 * @param engine   AnalyticsEngine instance
 * @param config   Pivot configuration
 * @returns        Reactive Ref containing the latest PivotResult or null
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePivot } from '@gridstorm/analytix-vue'
 * const pivotResult = usePivot(engine, pivotConfig)
 * </script>
 * ```
 */
export function usePivot(
  _engine: AnalyticsEngine,
  _config: PivotConfig
): Ref<PivotResult | null> {
  throw new Error(
    '[stub] usePivot() must be called inside a Vue component setup(). ' +
    'Install @gridstorm/analytix-vue in a Vue 3 project.'
  );
}

// ─── Runtime implementation (loaded lazily when vue is available) ─────────────

/**
 * createVueComposables — Returns the real composable implementations by
 * binding to Vue's reactivity system at runtime.
 *
 * Call this from your plugin install() function:
 *
 * ```typescript
 * import { createVueComposables } from '@gridstorm/analytix-vue'
 * const { useKpi, usePivot } = await createVueComposables()
 * ```
 */
export async function createVueComposables() {
  const vue = await getVue();

  function _useKpi(
    engine: AnalyticsEngine,
    config: KpiConfig
  ): Ref<KpiResult | null> {
    const result = vue.ref<KpiResult | null>(null);

    const compute = () => {
      try {
        engine.addKpiConfig(config);
        result.value = engine.computeKpi(config.id, true);
      } catch {
        result.value = null;
      }
    };

    vue.onMounted(compute);

    let cleanupUnsub: (() => void) | undefined;
    vue.onMounted(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanupUnsub = (engine.eventBus.on as any)('dataset:updated', compute);
    });
    vue.onUnmounted(() => {
      if (typeof cleanupUnsub === 'function') cleanupUnsub();
    });

    return result;
  }

  function _usePivot(
    engine: AnalyticsEngine,
    config: PivotConfig
  ): Ref<PivotResult | null> {
    const result = vue.ref<PivotResult | null>(null);

    const compute = () => {
      try {
        engine.addPivotConfig(config);
        result.value = engine.computePivot(config.id, true);
      } catch {
        result.value = null;
      }
    };

    vue.onMounted(compute);

    let cleanupUnsub: (() => void) | undefined;
    vue.onMounted(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanupUnsub = (engine.eventBus.on as any)('dataset:updated', compute);
    });
    vue.onUnmounted(() => {
      if (typeof cleanupUnsub === 'function') cleanupUnsub();
    });

    return result;
  }

  return {
    useKpi: _useKpi,
    usePivot: _usePivot,
  };
}

// ─── README ───────────────────────────────────────────────────────────────────

export const VUE_ADAPTER_README = `
# @gridstorm/analytix-vue

Vue 3 composables adapter for Analytics Builder.

## Installation

\`\`\`bash
pnpm add @gridstorm/analytix-vue @gridstorm/analytix-core vue
\`\`\`

## Usage

\`\`\`vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { AnalyticsEngine, buildDataset } from '@gridstorm/analytix-core'
import { createVueComposables } from '@gridstorm/analytix-vue'

const engine = new AnalyticsEngine()
const composables = await createVueComposables()

onMounted(() => {
  engine.addDataset(buildDataset({ id: 'sales', name: 'Sales', columns: [], rows: [] }))
})

const kpiResult = composables.useKpi(engine, {
  id: 'revenue',
  title: 'Revenue',
  datasetId: 'sales',
  columnId: 'revenue',
  aggregation: 'sum',
  filters: [],
  decimals: 0,
  refreshPolicy: { enabled: false, intervalSeconds: 30, pauseWhenHidden: true },
})
</script>

<template>
  <div>Revenue: {{ kpiResult.value?.formatted }}</div>
</template>
\`\`\`

## API

### createVueComposables()

Async factory that returns the real composable implementations wired to Vue's reactivity.

### useKpi(engine, config) → Ref<KpiResult | null>

Reactive KPI result. Re-computes whenever the source dataset changes.

### usePivot(engine, config) → Ref<PivotResult | null>

Reactive pivot table result. Re-computes whenever the source dataset changes.
`;
