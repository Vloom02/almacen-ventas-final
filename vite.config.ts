/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // NO usar manualChunks acá: agrupar react + react-router en un chunk propio
    // generaba un ReferenceError de inicialización (TDZ) en el build minificado
    // → la app quedaba en blanco. El chunking por defecto resuelve bien el orden.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
