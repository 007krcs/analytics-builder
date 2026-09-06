import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // When published under a path on www.tekivex.com (SITE_BASE=/analytics) all
  // asset URLs get that prefix; unset keeps the standalone root '/'.
  base: (process.env.SITE_BASE || '') + '/',
  plugins: [react()],
  resolve: {
    // Ensure workspace packages are resolved from source
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts'],
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Bundle size note: a previous manualChunks split (react / dnd / recharts /
    // xlsx / pdf) caused a runtime "Cannot read properties of undefined
    // (reading 'useLayoutEffect')" because Rollup placed React's runtime in a
    // separate chunk that evaluated AFTER its consumers. We now let Rollup
    // auto-chunk, which produces a single ~1.7MB bundle that loads correctly.
    //
    // If bundle size becomes a problem, prefer LAZY-LOADED routes
    // (`React.lazy(() => import('./HeavyPage'))`) rather than vendor
    // manualChunks — they don't fight the dependency graph.
    chunkSizeWarningLimit: 2000,
  },
});
