import { defineConfig } from '@playwright/test';

// Smoke E2E: levanta el dev server y verifica que la app arranca (sin pantalla
// en blanco). Apunta a flujos críticos sin depender de un backend de prueba.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:5174',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
