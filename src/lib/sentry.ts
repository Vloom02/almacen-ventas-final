// ═══════════════════════════════════════════════════════════════════════════
// Sentry: captura de errores en producción (APK / build real).
// Comparte el proyecto Sentry de Stockly; se distingue con el tag app=ventas.
// Solo reporta en PROD (no en `npm run dev`).
// ═══════════════════════════════════════════════════════════════════════════
import * as Sentry from '@sentry/react';

const DSN =
  (import.meta.env.VITE_SENTRY_DSN as string | undefined) ||
  'https://634f83fe864c8f590430acd4420df286@o4511522176499712.ingest.us.sentry.io/4511522180169728';

export function initSentry(): void {
  if (!import.meta.env.PROD || !DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    initialScope: { tags: { app: 'ventas' } },
    ignoreErrors: ['Failed to fetch', 'NetworkError', 'Load failed', 'AbortError', 'Timeout'],
  });
}
