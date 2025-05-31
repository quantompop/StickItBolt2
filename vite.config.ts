import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['draft-js', 'react-draft-wysiwyg'],
    exclude: ['lucide-react'],
    esbuildOptions: {
      target: 'es2020',
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false, // Disable sourcemaps in production to reduce build size
    chunkSizeWarningLimit: 1000, // Increase warning limit
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Optimize chunks to reduce the number of generated files
        manualChunks: (id) => {
          // Group all lucide-react icons into a single chunk
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          // Group react and related packages
          if (id.includes('node_modules/react')) {
            return 'vendor-react';
          }
          // Group firebase related packages
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          // Group draft-js related packages
          if (id.includes('node_modules/draft-js') || id.includes('node_modules/react-draft-wysiwyg')) {
            return 'vendor-draft-js';
          }
          // All other dependencies
          if (id.includes('node_modules')) {
            return 'vendor-others';
          }
        },
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      },
      external: []
    },
    assetsInlineLimit: 4096, // Inline small assets (4kb or less)
  },
  base: './', // Use relative paths - crucial for Electron to find assets
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});