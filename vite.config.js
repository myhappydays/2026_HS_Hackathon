import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    allowedHosts: ['fedora-1.tailda0655.ts.net']
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
