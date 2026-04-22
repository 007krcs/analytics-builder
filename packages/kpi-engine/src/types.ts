// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * KPI engine internal types.
 */

export interface RefreshHandle {
  kpiId: string;
  intervalId: ReturnType<typeof setInterval>;
  refreshCount: number;
  startedAt: Date;
}
