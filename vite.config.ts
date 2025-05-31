import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    // Required for Draft.js
    'process.env': {
      NODE_ENV: mode === 'production' ? JSON.stringify('production') : JSON.stringify('development'),
    },
    global: 'window',
  },
  optimizeDeps: {
    include: ['draft-js', 'immutable'],
    esbuildOptions: {
      target: 'es2020',
    }
  },
  resolve: {
    alias: {
      // Fix Draft.js imports
      'draft-js': resolve(__dirname, 'node_modules/draft-js'),
      'immutable': resolve(__dirname, 'node_modules/immutable'),
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: mode !== 'production', // Disable sourcemaps in production
    chunkSizeWarningLimit: 1000, // Increase warning limit
    cssCodeSplit: false, // Keep CSS in one file
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
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
          if (id.includes('node_modules/draft-js') || 
              id.includes('node_modules/immutable')) {
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
      }
    },
    assetsInlineLimit: 4096, // Inline small assets
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  base: './', // Use relative paths for Electron
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
}));