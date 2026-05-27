import { describe, expect, it } from 'vitest';
import { CanvasEngine, LATEST_LAYOUT_VERSION, migrateLayout, LAYOUT_MIGRATIONS } from './canvas-engine.js';

describe('CanvasEngine layout versioning', () => {
  it('getLayout() reports LATEST_LAYOUT_VERSION', () => {
    const eng = new CanvasEngine();
    eng.addWidget('chart', { x: 0, y: 0 }, { width: 100, height: 100 }, 'w1');
    expect(eng.getLayout().version).toBe(LATEST_LAYOUT_VERSION);
  });

  it('loadLayout accepts a layout at the latest version', () => {
    const eng = new CanvasEngine();
    eng.addWidget('chart', { x: 0, y: 0 }, { width: 100, height: 100 }, 'w1');
    const layout = eng.getLayout();
    const eng2 = new CanvasEngine();
    expect(() => eng2.loadLayout(layout)).not.toThrow();
  });

  it('loadLayout REJECTS an unknown future version (no silent corruption)', () => {
    const eng = new CanvasEngine();
    eng.addWidget('chart', { x: 0, y: 0 }, { width: 100, height: 100 }, 'w1');
    const future = { ...eng.getLayout(), version: '999-future' };
    expect(() => eng.loadLayout(future)).toThrow(/version "999-future"/);
  });

  it('migrateLayout runs registered migrations forward to the latest', () => {
    // Add a temp v0→v1 migration just for this test
    LAYOUT_MIGRATIONS['0'] = (l) => ({ ...l, version: '1' });
    try {
      const old = { version: '0', widgets: [], viewport: { x: 0, y: 0 }, zoom: 1 };
      const migrated = migrateLayout(old);
      expect(migrated.version).toBe('1');
    } finally {
      delete LAYOUT_MIGRATIONS['0'];
    }
  });
});
