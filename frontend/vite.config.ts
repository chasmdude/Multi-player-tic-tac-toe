import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/v2': {
        target: 'http://localhost:7350',
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: 'ws://localhost:7350',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
