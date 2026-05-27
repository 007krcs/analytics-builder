// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * KPI engine internal types.
 */

export interface RefreshHandle {
  kpiId: string;
  /** Active setTimeout id for the next tick (we use setTimeout, not setInterval, for backoff). */
  timeoutId: ReturnType<typeof setTimeout>;
  refreshCount: number;
  startedAt: Date;
  /** Consecutive errors since the last successful tick — drives exponential backoff. */
  consecutiveErrors: number;
}
