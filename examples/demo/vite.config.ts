import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx'))                 return 'xlsx';
            if (id.includes('recharts') ||
                id.includes('victory-vendor') ||
                id.includes('d3-'))                  return 'recharts';
            if (id.includes('react-dom') ||
                id.includes('scheduler') ||
                id.includes('react/'))               return 'react';
            if (id.includes('@dnd-kit'))             return 'dnd';
            if (id.includes('pdf-lib'))              return 'pdf';
          }
          if (id.includes('packages/') && id.includes('@analytix')) {
            return 'analytix';
          }
        },
      },
    },
  },
});
