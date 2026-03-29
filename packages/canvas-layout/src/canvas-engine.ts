/**
 * CanvasEngine — Layout state manager with undo/redo and serialization.
 */

import type { CanvasWidget, CanvasLayout, Position, Size, ResizeHandle, SnapGuide } from './types.js';
import { snapPosition, snapSize } from './snap-engine.js';
import { defaultWidgetRegistry }  from './widget-registry.js';

const MAX_HISTORY = 20;

type CanvasEngineListener = (layout: CanvasLayout) => void;

export class CanvasEngine {
  private _widgets:   Map<string, CanvasWidget> = new Map();
  private _viewport:  Position = { x: 0, y: 0 };
  private _zoom:      number   = 1;
  private _history:   CanvasLayout[] = [];
  private _historyPos = -1;
  private _listeners: Set<CanvasEngineListener> = new Set();
  private _snapGuides: SnapGuide[] = [];
  private _nextZIndex = 1;

  // ── Widget CRUD ──────────────────────────────────────────────

  addWidget(type: string, position?: Position, size?: Size, title?: string, config?: Record<string, unknown>): string {
    const def      = defaultWidgetRegistry.get(type);
    const id       = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const finalPos = position ?? { x: 40 + (this._widgets.size % 6) * 60, y: 40 + (this._widgets.size % 4) * 60 };
    const finalSz  = size    ?? def?.defaultSize ?? { width: 300, height: 200 };

    const widget: CanvasWidget = {
      id,
      type,
      position: finalPos,
      size:     finalSz,
      title:    title ?? def?.displayName ?? type,
      config:   config ?? {},
      locked:   false,
      zIndex:   this._nextZIndex++,
    };

    this._saveHistory();
    this._widgets.set(id, widget);
    this._emit();
    return id;
  }

  removeWidget(id: string): void {
    if (!this._widgets.has(id)) return;
    this._saveHistory();
    this._widgets.delete(id);
    this._emit();
  }

  duplicateWidget(id: string): string | null {
    const w = this._widgets.get(id);
    if (!w) return null;
    return this.addWidget(
      w.type,
      { x: w.position.x + 32, y: w.position.y + 32 },
      { ...w.size },
      `${w.title} (copy)`,
      { ...w.config }
    );
  }

  updateWidget(id: string, updates: Partial<Omit<CanvasWidget, 'id'>>): void {
    const w = this._widgets.get(id);
    if (!w) return;
    this._saveHistory();
    this._widgets.set(id, { ...w, ...updates });
    this._emit();
  }

  // ── Move & Resize ────────────────────────────────────────────

  moveWidget(id: string, dx: number, dy: number): void {
    const w = this._widgets.get(id);
    if (!w || w.locked) return;

    const raw: Position = { x: w.position.x + dx, y: w.position.y + dy };
    const others        = Array.from(this._widgets.values());
    const { position, guides } = snapPosition(raw, w.size, others, id);

    this._snapGuides = guides;
    // Don't save history on every move (would flood the stack); caller calls commitMove()
    this._widgets.set(id, { ...w, position, zIndex: this._nextZIndex++ });
    this._emit();
  }

  /** Call after drag ends to commit the move to history */
  commitMove(): void {
    this._saveHistory();
    this._snapGuides = [];
    this._emit();
  }

  resizeWidget(id: string, handle: ResizeHandle, dx: number, dy: number): void {
    const w   = this._widgets.get(id);
    if (!w || w.locked) return;
    const def = defaultWidgetRegistry.get(w.type);

    let { x, y }           = w.position;
    let { width, height }  = w.size;

    if (handle.includes('e')) width  += dx;
    if (handle.includes('s')) height += dy;
    if (handle.includes('w')) { x += dx; width  -= dx; }
    if (handle.includes('n')) { y += dy; height -= dy; }

    const snapped = snapSize({ width, height }, def?.minSize);
    this._widgets.set(id, {
      ...w,
      position: { x: Math.max(0, x), y: Math.max(0, y) },
      size:     snapped,
    });
    this._emit();
  }

  commitResize(): void {
    this._saveHistory();
    this._emit();
  }

  bringToFront(id: string): void {
    const w = this._widgets.get(id);
    if (!w) return;
    this._widgets.set(id, { ...w, zIndex: this._nextZIndex++ });
    this._emit();
  }

  // ── Layout serialization ─────────────────────────────────────

  getLayout(): CanvasLayout {
    return {
      version:  '1',
      widgets:  Array.from(this._widgets.values()),
      viewport: { ...this._viewport },
      zoom:     this._zoom,
    };
  }

  loadLayout(layout: CanvasLayout): void {
    this._saveHistory();
    this._widgets   = new Map(layout.widgets.map((w) => [w.id, w]));
    this._viewport  = { ...layout.viewport };
    this._zoom      = layout.zoom;
    this._nextZIndex = Math.max(...layout.widgets.map((w) => w.zIndex), 0) + 1;
    this._emit();
  }

  // ── Viewport ─────────────────────────────────────────────────

  setZoom(zoom: number): void {
    this._zoom = Math.max(0.25, Math.min(3, zoom));
    this._emit();
  }

  setViewport(vp: Position): void {
    this._viewport = vp;
    this._emit();
  }

  get zoom()     { return this._zoom; }
  get viewport() { return { ...this._viewport }; }

  // ── Snap guides ──────────────────────────────────────────────

  get snapGuides(): SnapGuide[] { return this._snapGuides; }

  clearSnapGuides(): void {
    this._snapGuides = [];
    this._emit();
  }

  // ── Undo / Redo ──────────────────────────────────────────────

  undo(): void {
    if (this._historyPos <= 0) return;
    this._historyPos--;
    this._restoreHistory();
  }

  redo(): void {
    if (this._historyPos >= this._history.length - 1) return;
    this._historyPos++;
    this._restoreHistory();
  }

  get canUndo() { return this._historyPos > 0; }
  get canRedo() { return this._historyPos < this._history.length - 1; }

  private _saveHistory(): void {
    // Trim redo branch
    if (this._historyPos < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyPos + 1);
    }
    this._history.push(this.getLayout());
    if (this._history.length > MAX_HISTORY) {
      this._history.shift();
    }
    this._historyPos = this._history.length - 1;
  }

  private _restoreHistory(): void {
    const snapshot = this._history[this._historyPos];
    if (!snapshot) return;
    this._widgets   = new Map(snapshot.widgets.map((w) => [w.id, { ...w }]));
    this._viewport  = { ...snapshot.viewport };
    this._zoom      = snapshot.zoom;
    this._emit();
  }

  // ── Subscriptions ────────────────────────────────────────────

  subscribe(listener: CanvasEngineListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  private _emit(): void {
    const layout = this.getLayout();
    for (const fn of this._listeners) {
      try { fn(layout); } catch { /* ignore */ }
    }
  }
}
