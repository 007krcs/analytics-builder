// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * CanvasMinimap — Thumbnail overview of the full canvas.
 * Shows all widget positions scaled to the minimap dimensions.
 */

import type { CanvasWidget } from '../types.js';

export interface CanvasMinimapProps {
  widgets:      CanvasWidget[];
  canvasWidth:  number;
  canvasHeight: number;
  viewportX:    number;
  viewportY:    number;
  viewportW:    number;
  viewportH:    number;
  selectedIds?: Set<string>;
}

const MINIMAP_W = 160;
const MINIMAP_H = 100;

export function CanvasMinimap({
  widgets,
  canvasWidth,
  canvasHeight,
  viewportX,
  viewportY,
  viewportW,
  viewportH,
  selectedIds,
}: CanvasMinimapProps) {
  const scaleX = MINIMAP_W / Math.max(canvasWidth,  1);
  const scaleY = MINIMAP_H / Math.max(canvasHeight, 1);

  return (
    <div className="canvas-minimap" aria-label="Canvas minimap" role="img">
      <svg width={MINIMAP_W} height={MINIMAP_H} style={{ display: 'block' }}>
        {/* Background */}
        <rect x={0} y={0} width={MINIMAP_W} height={MINIMAP_H} fill="#f1f5f9" />

        {/* Widgets */}
        {widgets.map((w) => (
          <rect
            key={w.id}
            x={w.position.x * scaleX}
            y={w.position.y * scaleY}
            width={Math.max(w.size.width  * scaleX, 2)}
            height={Math.max(w.size.height * scaleY, 2)}
            fill={selectedIds?.has(w.id) ? '#6366f1' : '#94a3b8'}
            rx={1}
          />
        ))}

        {/* Viewport rect */}
        <rect
          x={viewportX * scaleX}
          y={viewportY * scaleY}
          width={Math.min(viewportW * scaleX, MINIMAP_W)}
          height={Math.min(viewportH * scaleY, MINIMAP_H)}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={1.5}
          opacity={0.8}
        />
      </svg>
    </div>
  );
}
