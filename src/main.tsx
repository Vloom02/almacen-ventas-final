import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { initSentry } from './lib/sentry';
import { aplicarMovimiento, movimientoActivo } from './lib/movimiento';

initSentry(); // captura de errores (no-op en desarrollo)
aplicarMovimiento(movimientoActivo());

// Android: don't let content go behind status bar
StatusBar.setOverlaysWebView({ overlay: false }).catch(()=>{});
// El estilo (íconos claros u oscuros) lo fija ThemeContext según el tema.

// Keyboard handling
Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(()=>{});

const container = document.getElementById('root');
const root      = createRoot(container!);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={
      <div style={{ padding: 24, textAlign: 'center', fontFamily: 'system-ui' }}>
        <h2>Ups, algo salió mal</h2>
        <p>Cerrá y volvé a abrir la app. Ya nos llegó el aviso.</p>
      </div>
    }>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
