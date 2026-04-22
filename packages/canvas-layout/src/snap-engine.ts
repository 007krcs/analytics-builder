// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * SnapEngine — Snap-to-grid and snap-to-edge functionality.
 */

import type { CanvasWidget, Position, Size, SnapGuide } from './types.js';

const GRID_SIZE      = 8;
const EDGE_THRESHOLD = 12;  // px within which to snap to another widget edge
const CENTER_THRESHOLD = 16;

/** Snap a single value to the nearest grid point */
function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

export interface SnapResult {
  position: Position;
  guides:   SnapGuide[];
}

/**
 * Snap a position to the grid and optionally to other widget edges.
 *
 * @param pos        Proposed position of the widget being moved
 * @param size       Size of the widget being moved
 * @param others     All other widgets currently on the canvas
 * @param movingId   ID of the widget being moved (excluded from snap targets)
 */
export function snapPosition(
  pos: Position,
  size: Size,
  others: CanvasWidget[],
  movingId: string
): SnapResult {
  let { x, y } = pos;
  const guides: SnapGuide[] = [];

  // ── Snap to grid first ────────────────────────────────────────
  x = snapToGrid(x);
  y = snapToGrid(y);

  // ── Snap to other widget edges ────────────────────────────────
  const right  = x + size.width;
  const bottom = y + size.height;
  const cx     = x + size.width  / 2;
  const cy     = y + size.height / 2;

  for (const other of others) {
    if (other.id === movingId) continue;
    const ox  = other.position.x;
    const oy  = other.position.y;
    const or  = ox + other.size.width;
    const ob  = oy + other.size.height;
    const ocx = ox + other.size.width  / 2;
    const ocy = oy + other.size.height / 2;

    // X-axis edge snaps
    const xSnaps: Array<[number, number, string]> = [
      [x,     ox, 'left-to-left'],
      [x,     or, 'left-to-right'],
      [right, ox, 'right-to-left'],
      [right, or, 'right-to-right'],
      [cx,   ocx, 'center-x'],
    ];

    for (const [myEdge, otherEdge, _label] of xSnaps) {
      const dist = Math.abs(myEdge - otherEdge);
      const threshold = _label === 'center-x' ? CENTER_THRESHOLD : EDGE_THRESHOLD;
      if (dist < threshold) {
        x += otherEdge - myEdge;
        guides.push({ axis: 'x', position: otherEdge, fromWidget: other.id });
        break;
      }
    }

    // Y-axis edge snaps
    const ySnaps: Array<[number, number, string]> = [
      [y,      oy, 'top-to-top'],
      [y,      ob, 'top-to-bottom'],
      [bottom, oy, 'bottom-to-top'],
      [bottom, ob, 'bottom-to-bottom'],
      [cy,    ocy, 'center-y'],
    ];

    for (const [myEdge, otherEdge, _label] of ySnaps) {
      const dist = Math.abs(myEdge - otherEdge);
      const threshold = _label === 'center-y' ? CENTER_THRESHOLD : EDGE_THRESHOLD;
      if (dist < threshold) {
        y += otherEdge - myEdge;
        guides.push({ axis: 'y', position: otherEdge, fromWidget: other.id });
        break;
      }
    }
  }

  return {
    position: { x: Math.max(0, x), y: Math.max(0, y) },
    guides,
  };
}

/** Snap a size to grid */
export function snapSize(size: Size, minSize?: Size): Size {
  return {
    width:  Math.max(snapToGrid(size.width),  minSize?.width  ?? GRID_SIZE),
    height: Math.max(snapToGrid(size.height), minSize?.height ?? GRID_SIZE),
  };
}
