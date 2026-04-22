// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * WidgetRegistry — Register and look up widget type definitions.
 */

import type { WidgetTypeDef } from './types.js';

export class WidgetRegistry {
  private readonly _types = new Map<string, WidgetTypeDef>();

  register(def: WidgetTypeDef): void {
    this._types.set(def.type, def);
  }

  get(type: string): WidgetTypeDef | undefined {
    return this._types.get(type);
  }

  getAll(): WidgetTypeDef[] {
    return Array.from(this._types.values());
  }

  has(type: string): boolean {
    return this._types.has(type);
  }
}

/** Global default registry pre-populated with built-in widget types */
export const defaultWidgetRegistry = new WidgetRegistry();

defaultWidgetRegistry.register({
  type:        'bar-chart',
  displayName: 'Bar Chart',
  defaultSize: { width: 400, height: 300 },
  minSize:     { width: 200, height: 160 },
});
defaultWidgetRegistry.register({
  type:        'line-chart',
  displayName: 'Line Chart',
  defaultSize: { width: 400, height: 300 },
  minSize:     { width: 200, height: 160 },
});
defaultWidgetRegistry.register({
  type:        'pie-chart',
  displayName: 'Pie Chart',
  defaultSize: { width: 300, height: 300 },
  minSize:     { width: 200, height: 200 },
});
defaultWidgetRegistry.register({
  type:        'kpi-card',
  displayName: 'KPI Card',
  defaultSize: { width: 200, height: 140 },
  minSize:     { width: 140, height: 100 },
});
defaultWidgetRegistry.register({
  type:        'pivot-table',
  displayName: 'Pivot Table',
  defaultSize: { width: 600, height: 400 },
  minSize:     { width: 300, height: 200 },
});
defaultWidgetRegistry.register({
  type:        'text',
  displayName: 'Text Block',
  defaultSize: { width: 300, height: 120 },
  minSize:     { width: 100, height: 60 },
});
