import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
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
