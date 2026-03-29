/**
 * AlignmentGuides — Visual snap guide lines drawn on the canvas.
 */

import type { SnapGuide } from '../types.js';

export interface AlignmentGuidesProps {
  guides:     SnapGuide[];
  canvasWidth:  number;
  canvasHeight: number;
}

export function AlignmentGuides({ guides, canvasWidth, canvasHeight }: AlignmentGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <svg
      className="canvas-guides"
      width={canvasWidth}
      height={canvasHeight}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
      aria-hidden="true"
    >
      {guides.map((guide, i) => (
        guide.axis === 'x' ? (
          <line
            key={`guide-x-${i}`}
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={canvasHeight}
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.8}
          />
        ) : (
          <line
            key={`guide-y-${i}`}
            x1={0}
            y1={guide.position}
            x2={canvasWidth}
            y2={guide.position}
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.8}
          />
        )
      ))}
    </svg>
  );
}
