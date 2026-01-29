import path from "path"
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Minification with terser for better compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'vuex'],
          icons: ['@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/vue-fontawesome'],
        },
      },
    },
    // Enable gzip pre-compression reporting
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
  },
  resolve: {
    alias: {
      // resolve "@" - required for css imports
      "@": path.resolve(__dirname, "src"),
      // we need to use the vue build with the runtime template compiler included, otherwise vue will complain about the needing the runtime template compiler or to pre-compile the templates
      vue: 'vue/dist/vue.esm.js',
    }
  },
  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    exclude: ['tests/e2e/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/main.js', 'src/router/**']
    }
  }
})
