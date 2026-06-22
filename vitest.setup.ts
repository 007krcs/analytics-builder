// Global vitest setup — applied to every test file via `setupFiles`.
//
//  1. Register @testing-library/jest-dom matchers (toBeInTheDocument, …) on
//     vitest's `expect`. Harmless in node-env suites; they just go unused.
//  2. Unmount React trees + reset document.body between tests. Testing Library's
//     auto-cleanup only fires when `globals: true`; we run without globals, so
//     we wire cleanup explicitly. Without this, every render() accumulates in
//     document.body and `getByText` throws "found multiple elements".
//
// The DOM-touching halves are guarded so node-environment packages (which have
// no `document`) don't crash importing this file.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

if (typeof document !== 'undefined') {
  // ResizeObserver polyfill — not provided by happy-dom.
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  // Lazy import so node-env suites never load React DOM machinery.
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => cleanup());
}
