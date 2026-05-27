// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * @gridstorm/analytix-vue — Vue 3 composables for Analytics Builder.
 *
 * Works in both real Vue 3 apps (uses vue's ref/onMounted/onUnmounted if
 * installed) and in plain Node tests (falls back to a minimal subscribable
 * ref). Either way the same composable names are exported.
 *
 *   import { useAnalyticsEngine, useKpi, usePivot } from '@gridstorm/analytix-vue';
 */

import type {
  AnalyticsEngine,
  KpiConfig,
  KpiResult,
  PivotConfig,
  PivotResult,
} from '@gridstorm/analytix-core';
import { AnalyticsEngine as AnalyticsEngineCtor } from '@gridstorm/analytix-core';

// ─── Minimal Vue surface (real or fallback) ──────────────────────────────────

interface Ref<T> { value: T }

interface VueShim {
  ref<T>(initial: T): Ref<T>;
  onMounted(cb: () => void): void;
  onUnmounted(cb: () => void): void;
}

// Built-in fallback when vue is not present (tests, server-side smoke).
const fallback: VueShim = {
  ref<T>(initial: T): Ref<T> {
    return { value: initial };
  },
  onMounted(cb)   { cb(); },
  onUnmounted(_cb) { /* no-op outside Vue */ },
};

let cachedVue: VueShim | null = null;
function getVue(): VueShim {
  if (cachedVue) return cachedVue;
  // Synchronously look for the vue runtime. require() is not always available
  // (ESM); we use createRequire to avoid eval/dynamic-import-from-CJS issues.
  try {
    // Use Function('return require') so bundlers don't statically depend on vue.
    const req = (Function('return typeof require!=="undefined"&&require'))() as
      | ((id: string) => unknown)
      | undefined;
    if (req) {
      const v = req('vue') as Partial<VueShim>;
      if (v && typeof v.ref === 'function' && typeof v.onMounted === 'function' && typeof v.onUnmounted === 'function') {
        cachedVue = v as VueShim;
        return cachedVue;
      }
    }
  } catch {
    // vue not installed — fall through
  }
  cachedVue = fallback;
  return cachedVue;
}

// ─── Composables ──────────────────────────────────────────────────────────────

/**
 * Create (or receive) an AnalyticsEngine bound to the component lifecycle.
 * Pass an existing engine to share it across components; omit to create one
 * scoped to this call.
 */
export function useAnalyticsEngine(existing?: AnalyticsEngine): { engine: AnalyticsEngine } {
  const engine = existing ?? new AnalyticsEngineCtor();
  if (!existing) {
    const vue = getVue();
    vue.onUnmounted(() => engine.destroy());
  }
  return { engine };
}

/** Reactive KPI result that recomputes whenever the dataset changes. */
export function useKpi(engine: AnalyticsEngine, config: KpiConfig): Ref<KpiResult | null> {
  const vue = getVue();
  const result = vue.ref<KpiResult | null>(null);

  const compute = () => {
    try {
      engine.addKpiConfig(config);
      result.value = engine.computeKpi(config.id, true);
    } catch {
      result.value = null;
    }
  };

  let unsub: (() => void) | undefined;
  vue.onMounted(() => {
    compute();
    unsub = engine.eventBus.on('dataset:updated', compute);
  });
  vue.onUnmounted(() => { unsub?.(); });

  return result;
}

/** Reactive pivot result that recomputes on dataset changes. */
export function usePivot(engine: AnalyticsEngine, config: PivotConfig): Ref<PivotResult | null> {
  const vue = getVue();
  const result = vue.ref<PivotResult | null>(null);

  const compute = () => {
    try {
      engine.addPivotConfig(config);
      result.value = engine.computePivot(config.id, true);
    } catch {
      result.value = null;
    }
  };

  let unsub: (() => void) | undefined;
  vue.onMounted(() => {
    compute();
    unsub = engine.eventBus.on('dataset:updated', compute);
  });
  vue.onUnmounted(() => { unsub?.(); });

  return result;
}

// Kept for backwards compatibility — old code may import it.
export async function createVueComposables() {
  return { useKpi, usePivot };
}

export const VUE_ADAPTER_README = `
# @gridstorm/analytix-vue
Vue 3 composables — useAnalyticsEngine, useKpi, usePivot.
Falls back to a minimal ref shim when vue is not installed (e.g. tests).
`;
