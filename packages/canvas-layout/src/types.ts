/**
 * Types for @gridstorm/analytix-canvas-layout
 */

/** Pixel position on the canvas */
export interface Position {
  x: number;
  y: number;
}

/** Pixel dimensions */
export interface Size {
  width:  number;
  height: number;
}

/** Resize handle locations */
export type ResizeHandle =
  | 'n' | 's' | 'e' | 'w'
  | 'nw' | 'ne' | 'sw' | 'se';

/** A widget placed on the canvas */
export interface CanvasWidget {
  id:       string;
  type:     string;
  position: Position;
  size:     Size;
  title:    string;
  /** Arbitrary config for the widget's renderer */
  config:   Record<string, unknown>;
  /** Whether this widget is locked (cannot move/resize) */
  locked:   boolean;
  /** Z-order (higher = in front) */
  zIndex:   number;
}

/** A snap guide line to render */
export interface SnapGuide {
  axis:      'x' | 'y';
  position:  number;
  /** Source widget id that triggered this guide */
  fromWidget?: string;
}

/** Full canvas layout — serializable to JSON */
export interface CanvasLayout {
  version:  '1';
  widgets:  CanvasWidget[];
  /** Canvas scroll offset */
  viewport: Position;
  /** Zoom level (1 = 100%) */
  zoom:     number;
}

/** Registered widget type definition */
export interface WidgetTypeDef {
  type:         string;
  displayName:  string;
  defaultSize:  Size;
  minSize?:     Size;
  maxSize?:     Size;
  /** Render function key for the React renderer */
  renderer?:    string;
}
