/**
 * KPI engine internal types.
 */

export interface RefreshHandle {
  kpiId: string;
  intervalId: ReturnType<typeof setInterval>;
  refreshCount: number;
  startedAt: Date;
}
