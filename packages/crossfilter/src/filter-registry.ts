/**
 * FilterRegistry — Manages which widgets are registered and their dataset associations.
 */

import type { WidgetRegistration } from './filter-types.js';

export class FilterRegistry {
  private readonly _widgets = new Map<string, WidgetRegistration>();

  register(widgetId: string, datasetId: string): () => void {
    this._widgets.set(widgetId, { widgetId, datasetId });
    return () => {
      this._widgets.delete(widgetId);
    };
  }

  getDatasetId(widgetId: string): string | undefined {
    return this._widgets.get(widgetId)?.datasetId;
  }

  getWidgetsByDataset(datasetId: string): string[] {
    const result: string[] = [];
    for (const [id, reg] of this._widgets) {
      if (reg.datasetId === datasetId) result.push(id);
    }
    return result;
  }

  isRegistered(widgetId: string): boolean {
    return this._widgets.has(widgetId);
  }

  getAll(): WidgetRegistration[] {
    return Array.from(this._widgets.values());
  }
}
