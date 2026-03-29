/**
 * CanvasWidget — Draggable/resizable widget shell.
 * Uses pointer events for cross-browser drag and resize.
 */

import { useCallback, useRef } from 'react';
import type { CanvasWidget as CanvasWidgetType, ResizeHandle } from '../types.js';
import { WidgetToolbar } from './WidgetToolbar.js';

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  n:  'n-resize',  s:  's-resize',
  e:  'e-resize',  w:  'w-resize',
  nw: 'nw-resize', ne: 'ne-resize',
  sw: 'sw-resize', se: 'se-resize',
};

export interface CanvasWidgetProps {
  widget:      CanvasWidgetType;
  selected:    boolean;
  zoom:        number;
  onSelect:    (id: string, additive: boolean) => void;
  onMove:      (id: string, dx: number, dy: number) => void;
  onMoveEnd:   (id: string) => void;
  onResize:    (id: string, handle: ResizeHandle, dx: number, dy: number) => void;
  onResizeEnd: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete:    (id: string) => void;
  onLockToggle:(id: string) => void;
  onBringToFront:(id: string) => void;
  /** The rendered content of the widget */
  children?:   React.ReactNode;
}

export function CanvasWidgetComponent({
  widget,
  selected,
  zoom,
  onSelect,
  onMove,
  onMoveEnd,
  onResize,
  onResizeEnd,
  onDuplicate,
  onDelete,
  onLockToggle,
  onBringToFront,
  children,
}: CanvasWidgetProps) {
  const dragStart  = useRef<{ clientX: number; clientY: number } | null>(null);
  const isDragging = useRef(false);

  // ── Drag to move ─────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (widget.locked) return;
    if ((e.target as HTMLElement).dataset.handle) return; // resize handle click

    e.stopPropagation();
    onSelect(widget.id, e.ctrlKey || e.metaKey);

    dragStart.current = { clientX: e.clientX, clientY: e.clientY };
    isDragging.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [widget.id, widget.locked, onSelect]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = (e.clientX - dragStart.current.clientX) / zoom;
    const dy = (e.clientY - dragStart.current.clientY) / zoom;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDragging.current = true;
      dragStart.current  = { clientX: e.clientX, clientY: e.clientY };
      onMove(widget.id, dx, dy);
    }
  }, [widget.id, zoom, onMove]);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    dragStart.current = null;
    if (isDragging.current) {
      isDragging.current = false;
      onMoveEnd(widget.id);
    }
  }, [widget.id, onMoveEnd]);

  // ── Resize ───────────────────────────────────────────────────

  const resizeState = useRef<{ handle: ResizeHandle; clientX: number; clientY: number } | null>(null);

  const onResizePointerDown = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    resizeState.current = { handle, clientX: e.clientX, clientY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    if (!resizeState.current || resizeState.current.handle !== handle) return;
    const dx = (e.clientX - resizeState.current.clientX) / zoom;
    const dy = (e.clientY - resizeState.current.clientY) / zoom;
    resizeState.current = { handle, clientX: e.clientX, clientY: e.clientY };
    onResize(widget.id, handle, dx, dy);
  }, [widget.id, zoom, onResize]);

  const onResizePointerUp = useCallback((_e: React.PointerEvent, _handle: ResizeHandle) => {
    if (resizeState.current) {
      resizeState.current = null;
      onResizeEnd(widget.id);
    }
  }, [widget.id, onResizeEnd]);

  const classes = [
    'canvas-widget',
    selected   ? 'canvas-widget--selected' : '',
    widget.locked ? 'canvas-widget--locked' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{
        left:   widget.position.x,
        top:    widget.position.y,
        width:  widget.size.width,
        height: widget.size.height,
        zIndex: widget.zIndex,
        cursor: widget.locked ? 'default' : 'move',
      }}
      data-widget-id={widget.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Toolbar (visible on hover/select) */}
      <WidgetToolbar
        title={widget.title}
        locked={widget.locked}
        onDuplicate={() => onDuplicate(widget.id)}
        onDelete={() => onDelete(widget.id)}
        onLockToggle={() => onLockToggle(widget.id)}
        onBringToFront={() => onBringToFront(widget.id)}
      />

      {/* Widget content area */}
      <div className="canvas-widget__content">
        {children ?? (
          <div className="canvas-widget__placeholder">
            <span className="canvas-widget__type-label">{widget.type}</span>
          </div>
        )}
      </div>

      {/* Resize handles */}
      {!widget.locked && RESIZE_HANDLES.map((handle) => (
        <div
          key={handle}
          className={`canvas-widget__resize-handle canvas-widget__resize-handle--${handle}`}
          style={{ cursor: HANDLE_CURSORS[handle] }}
          data-handle={handle}
          onPointerDown={(e) => onResizePointerDown(e, handle)}
          onPointerMove={(e) => onResizePointerMove(e, handle)}
          onPointerUp={(e)   => onResizePointerUp(e, handle)}
        />
      ))}
    </div>
  );
}
