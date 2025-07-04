import path from "path"
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // resolve "@" - required for css imports
      "@": path.resolve(__dirname, "src"),
      // we need to use the vue build with the runtime template compiler included, otherwise vue will complain about the needing the runtime template compiler or to pre-compile the templates
      vue: 'vue/dist/vue.esm.js',
    }
  },
  build: {
    // Generate source maps for production debugging
    sourcemap: false,
    // Enable minification
    minify: 'esbuild',
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    // CSS code splitting
    cssCodeSplit: true,
    // Rollup options for optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          vendor: ['vue', 'vue-router', 'vuex'],
          utils: ['axios', 'moment'],
          ui: ['vuescroll', 'vue-spinner']
        }
      }
    },
    // Target modern browsers for smaller bundles
    target: 'es2015'
  },
  // CSS optimization
  css: {
    devSourcemap: false
  },
  // Server configuration for development
  server: {
    // Enable compression
    compression: true,
    // Proxy API calls to backend running on port 8000
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
