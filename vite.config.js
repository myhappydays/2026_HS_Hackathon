import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['fedora-1.tailda0655.ts.net']
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  build: {
    rollupOptions: {
      input: {
        main:   resolve(__dirname, 'index.html'),
        report: resolve(__dirname, 'report.html'),
        detail: resolve(__dirname, 'detail.html'),
      }
    }
  }
})
