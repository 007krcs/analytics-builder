// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * DashboardCanvas — Infinite freeform canvas with zoom, multi-select, and keyboard shortcuts.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CanvasWidget, CanvasLayout, ResizeHandle } from '../types.js';
import { CanvasEngine }           from '../canvas-engine.js';
import { CanvasWidgetComponent }  from './CanvasWidget.js';
import { AlignmentGuides }        from './AlignmentGuides.js';
import { CanvasMinimap }          from './CanvasMinimap.js';

// ── Canvas dimensions ─────────────────────────────────────────────────────────

const CANVAS_W = 4000;
const CANVAS_H = 3000;

// ── Widget renderer registry ──────────────────────────────────────────────────

export type WidgetRenderer = React.ComponentType<{ widget: CanvasWidget }>;

export interface DashboardCanvasProps {
  /** External engine; if not supplied, an internal one is created */
  engine?: CanvasEngine;
  /** Register custom renderers keyed by widget type */
  renderers?: Record<string, WidgetRenderer>;
  /** Called when layout changes */
  onLayoutChange?: (layout: CanvasLayout) => void;
  /** Extra class names for the outer element */
  className?: string;
}

export function DashboardCanvas({
  engine: propEngine,
  renderers = {},
  onLayoutChange,
  className = '',
}: DashboardCanvasProps) {
  // Use a stable engine instance
  const engineRef = useRef<CanvasEngine>(propEngine ?? new CanvasEngine());
  const engine    = engineRef.current;

  const [layout,      setLayout]      = useState<CanvasLayout>(() => engine.getLayout());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [zoom,        setZoomState]   = useState(1);

  const outerRef   = useRef<HTMLDivElement>(null);
  const innerRef   = useRef<HTMLDivElement>(null);

  // Subscribe to engine changes
  useEffect(() => {
    const unsub = engine.subscribe((l) => {
      setLayout(l);
      setZoomState(l.zoom);
      onLayoutChange?.(l);
    });
    return unsub;
  }, [engine, onLayoutChange]);

  // ── Zoom via Ctrl+Wheel ──────────────────────────────────────

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      engine.setZoom(engine.zoom + delta);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [engine]);

  // ── Keyboard shortcuts ───────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') { engine.undo(); e.preventDefault(); }
      if (ctrl && e.key === 'y') { engine.redo(); e.preventDefault(); }

      if (ctrl && e.key === 'd') {
        e.preventDefault();
        for (const id of selectedIds) engine.duplicateWidget(id);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          for (const id of selectedIds) engine.removeWidget(id);
          setSelectedIds(new Set());
        }
      }

      if (e.key === 'Escape') setSelectedIds(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, selectedIds]);

  // ── Rubber-band selection ─────────────────────────────────────

  const rbStart  = useRef<{ x: number; y: number } | null>(null);
  const [rbRect, setRbRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const onCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only start rubber band on canvas background (not widget)
    if ((e.target as HTMLElement).closest('[data-widget-id]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect   = innerRef.current?.getBoundingClientRect();
    if (!rect) return;
    rbStart.current = {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top)  / zoom,
    };
    setSelectedIds(new Set());
  }, [zoom]);

  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!rbStart.current) return;
    const rect = innerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx   = (e.clientX - rect.left) / zoom;
    const cy   = (e.clientY - rect.top)  / zoom;
    const x    = Math.min(cx, rbStart.current.x);
    const y    = Math.min(cy, rbStart.current.y);
    const w    = Math.abs(cx - rbStart.current.x);
    const h    = Math.abs(cy - rbStart.current.y);
    if (w > 4 || h > 4) setRbRect({ x, y, w, h });
  }, [zoom]);

  const onCanvasPointerUp = useCallback(() => {
    if (rbRect) {
      const selected = new Set<string>(
        layout.widgets
          .filter((w) =>
            w.position.x < rbRect.x + rbRect.w &&
            w.position.x + w.size.width  > rbRect.x &&
            w.position.y < rbRect.y + rbRect.h &&
            w.position.y + w.size.height > rbRect.y
          )
          .map((w) => w.id)
      );
      setSelectedIds(selected);
    }
    rbStart.current = null;
    setRbRect(null);
  }, [layout.widgets, rbRect]);

  // ── Widget event handlers ─────────────────────────────────────

  const handleSelect = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      }
      return new Set([id]);
    });
    engine.bringToFront(id);
  }, [engine]);

  const handleMove = useCallback((id: string, dx: number, dy: number) => {
    engine.moveWidget(id, dx, dy);
  }, [engine]);

  const handleMoveEnd = useCallback((_id: string) => {
    engine.commitMove();
  }, [engine]);

  const handleResize = useCallback((id: string, handle: ResizeHandle, dx: number, dy: number) => {
    engine.resizeWidget(id, handle, dx, dy);
  }, [engine]);

  const handleResizeEnd = useCallback((_id: string) => {
    engine.commitResize();
  }, [engine]);

  const handleDuplicate = useCallback((id: string) => {
    engine.duplicateWidget(id);
  }, [engine]);

  const handleDelete = useCallback((id: string) => {
    engine.removeWidget(id);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, [engine]);

  const handleLockToggle = useCallback((id: string) => {
    const w = layout.widgets.find((x) => x.id === id);
    if (w) engine.updateWidget(id, { locked: !w.locked });
  }, [engine, layout.widgets]);

  // ── Sorted widgets (by z-index) ───────────────────────────────

  const sortedWidgets = useMemo(
    () => [...layout.widgets].sort((a, b) => a.zIndex - b.zIndex),
    [layout.widgets]
  );

  // ── Viewport tracking for minimap ─────────────────────────────
  const [vpRect, setVpRect] = useState({ x: 0, y: 0, w: 800, h: 600 });
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => setVpRect({
      x: el.scrollLeft / zoom,
      y: el.scrollTop  / zoom,
      w: el.clientWidth  / zoom,
      h: el.clientHeight / zoom,
    });
    update();
    el.addEventListener('scroll', update);
    return () => el.removeEventListener('scroll', update);
  }, [zoom]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div
      className={`canvas-outer ${className}`}
      ref={outerRef}
      tabIndex={0}
      aria-label="Dashboard canvas"
      role="application"
    >
      {/* Zoom indicator */}
      <div className="canvas-zoom-indicator" aria-live="polite" aria-atomic="true">
        {Math.round(zoom * 100)}%
      </div>

      {/* Infinite inner canvas */}
      <div
        className="canvas-inner"
        ref={innerRef}
        style={{
          width:     CANVAS_W,
          height:    CANVAS_H,
          transform: `scale(${zoom})`,
          transformOrigin: '0 0',
          position:  'relative',
        }}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {/* Alignment guides */}
        <AlignmentGuides
          guides={engine.snapGuides}
          canvasWidth={CANVAS_W}
          canvasHeight={CANVAS_H}
        />

        {/* Rubber-band selection rect */}
        {rbRect && (
          <div
            className="canvas-rubber-band"
            style={{
              left:   rbRect.x,
              top:    rbRect.y,
              width:  rbRect.w,
              height: rbRect.h,
            }}
            aria-hidden="true"
          />
        )}

        {/* Widgets */}
        {sortedWidgets.map((widget) => {
          const Renderer = renderers[widget.type];
          return (
            <CanvasWidgetComponent
              key={widget.id}
              widget={widget}
              selected={selectedIds.has(widget.id)}
              zoom={zoom}
              onSelect={handleSelect}
              onMove={handleMove}
              onMoveEnd={handleMoveEnd}
              onResize={handleResize}
              onResizeEnd={handleResizeEnd}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onLockToggle={handleLockToggle}
              onBringToFront={() => engine.bringToFront(widget.id)}
            >
              {Renderer ? <Renderer widget={widget} /> : undefined}
            </CanvasWidgetComponent>
          );
        })}
      </div>

      {/* Minimap */}
      <CanvasMinimap
        widgets={sortedWidgets}
        canvasWidth={CANVAS_W}
        canvasHeight={CANVAS_H}
        viewportX={vpRect.x}
        viewportY={vpRect.y}
        viewportW={vpRect.w}
        viewportH={vpRect.h}
        selectedIds={selectedIds}
      />

      {/* Undo/Redo toolbar */}
      <div className="canvas-toolbar" role="toolbar" aria-label="Canvas controls">
        <button
          className="canvas-toolbar__btn"
          onClick={() => engine.undo()}
          disabled={!engine.canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          ↩
        </button>
        <button
          className="canvas-toolbar__btn"
          onClick={() => engine.redo()}
          disabled={!engine.canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          ↪
        </button>
        <span className="canvas-toolbar__sep" aria-hidden="true" />
        <button
          className="canvas-toolbar__btn"
          onClick={() => engine.setZoom(engine.zoom - 0.1)}
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="canvas-toolbar__zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          className="canvas-toolbar__btn"
          onClick={() => engine.setZoom(engine.zoom + 0.1)}
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          className="canvas-toolbar__btn"
          onClick={() => engine.setZoom(1)}
          title="Reset zoom"
          aria-label="Reset zoom to 100%"
        >
          100%
        </button>
      </div>
    </div>
  );
}
