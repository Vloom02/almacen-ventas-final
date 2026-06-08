import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { initSentry } from './lib/sentry';

initSentry(); // captura de errores (no-op en desarrollo)

// Android: don't let content go behind status bar
StatusBar.setOverlaysWebView({ overlay: false }).catch(()=>{});
StatusBar.setStyle({ style: Style.Dark }).catch(()=>{});

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
