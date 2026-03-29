/**
 * WidgetToolbar — Per-widget action bar: title, duplicate, delete, settings.
 */


export interface WidgetToolbarProps {
  title:         string;
  locked:        boolean;
  onDuplicate:   () => void;
  onDelete:      () => void;
  onLockToggle:  () => void;
  onBringToFront?: () => void;
}

export function WidgetToolbar({
  title,
  locked,
  onDuplicate,
  onDelete,
  onLockToggle,
  onBringToFront,
}: WidgetToolbarProps) {
  return (
    <div className="canvas-widget__toolbar" role="toolbar" aria-label={`Widget toolbar: ${title}`}>
      <span className="canvas-widget__title" title={title}>{title}</span>

      <div className="canvas-widget__toolbar-actions">
        {onBringToFront && (
          <button
            className="canvas-widget__toolbar-btn"
            onClick={(e) => { e.stopPropagation(); onBringToFront(); }}
            title="Bring to front"
            aria-label="Bring to front"
          >
            ↑
          </button>
        )}

        <button
          className="canvas-widget__toolbar-btn"
          onClick={(e) => { e.stopPropagation(); onLockToggle(); }}
          title={locked ? 'Unlock widget' : 'Lock widget'}
          aria-label={locked ? 'Unlock widget' : 'Lock widget'}
        >
          {locked ? '🔒' : '🔓'}
        </button>

        <button
          className="canvas-widget__toolbar-btn"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          title="Duplicate widget (Ctrl+D)"
          aria-label="Duplicate"
        >
          ⧉
        </button>

        <button
          className="canvas-widget__toolbar-btn canvas-widget__toolbar-btn--danger"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete widget (Del)"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
