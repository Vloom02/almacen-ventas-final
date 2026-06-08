import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

// Android: don't let content go behind status bar
StatusBar.setOverlaysWebView({ overlay: false }).catch(()=>{});
StatusBar.setStyle({ style: Style.Dark }).catch(()=>{});

// Keyboard handling
Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(()=>{});

const container = document.getElementById('root');
const root      = createRoot(container!);
root.render(<React.StrictMode><App /></React.StrictMode>);
