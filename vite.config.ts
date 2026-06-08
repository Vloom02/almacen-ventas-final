/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Vendors pesados en chunks propios: se cachean entre deploys y cargan en paralelo.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router', 'react-router-dom'],
          ionic: ['@ionic/react', '@ionic/react-router'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1200, // el chunk de Ionic (~1.1 MB) es el framework: esperado y cacheado
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
