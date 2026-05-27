// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * @gridstorm/analytix-canvas-layout
 *
 * Freeform drag-and-drop dashboard canvas.
 * Like Figma for dashboards — place widgets anywhere, resize freely, snap to guides.
 */

export { CanvasEngine, LATEST_LAYOUT_VERSION, LAYOUT_MIGRATIONS, migrateLayout } from './canvas-engine.js';
export { WidgetRegistry, defaultWidgetRegistry } from './widget-registry.js';
export { snapPosition, snapSize } from './snap-engine.js';

// React components
export { DashboardCanvas }        from './react/DashboardCanvas.js';
export type { DashboardCanvasProps, WidgetRenderer } from './react/DashboardCanvas.js';

export { CanvasWidgetComponent }  from './react/CanvasWidget.js';
export type { CanvasWidgetProps } from './react/CanvasWidget.js';

export { AlignmentGuides }        from './react/AlignmentGuides.js';
export type { AlignmentGuidesProps } from './react/AlignmentGuides.js';

export { WidgetToolbar }          from './react/WidgetToolbar.js';
export type { WidgetToolbarProps } from './react/WidgetToolbar.js';

export { CanvasMinimap }          from './react/CanvasMinimap.js';
export type { CanvasMinimapProps } from './react/CanvasMinimap.js';

export type {
  Position,
  Size,
  ResizeHandle,
  CanvasWidget,
  SnapGuide,
  CanvasLayout,
  WidgetTypeDef,
} from './types.js';
