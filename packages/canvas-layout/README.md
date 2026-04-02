# @gridstorm/analytix-canvas-layout

Freeform drag-and-drop dashboard canvas for [Analytics Studio](https://analytics.tekivex.com) — snap guides, undo/redo, minimap, and responsive grid layout.

## Install

```bash
npm install @gridstorm/analytix-canvas-layout
```

## Quick Start

```tsx
import { AnalyticsCanvas } from '@gridstorm/analytix-canvas-layout';

function Dashboard() {
  return (
    <AnalyticsCanvas
      widgets={widgets}
      onLayoutChange={(layout) => saveLayout(layout)}
      snapToGrid={true}
      showMinimap={true}
    />
  );
}
```

## Features

- **Freeform drag-and-drop** — place widgets anywhere on an infinite canvas
- **Snap guides** — smart alignment guides appear while dragging
- **Undo / redo** — full layout history with Ctrl+Z / Ctrl+Y
- **Minimap** — overview of the full dashboard at a glance
- **Responsive grid** — optional 12-column grid mode for structured layouts
- **Multi-select** — select and move multiple widgets at once

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
