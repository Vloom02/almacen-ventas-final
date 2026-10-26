// ═══════════════════════════════════════════════════════════════════════════
// Tema claro/oscuro. Togglea la clase `body.dark` y persiste en IndexedDB.
// Si el usuario nunca eligió, arranca en claro (más legible para el público mayor).
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { openDB, getLocalSetting, setLocalSetting } from '../lib/outbox';

interface ThemeCtx {
  isDark: boolean;
  toggleDark: () => void;
}

const Ctx = createContext<ThemeCtx | undefined>(undefined);

function applyDark(dark: boolean) {
  // En documentElement (html), no en body: así las variables del tema oscuro
  // llegan a los componentes de Ionic (shadow DOM) y el texto no queda ilegible.
  document.documentElement.classList.toggle('dark', dark);
  // Íconos de la barra de estado que contrasten con el tema (Style.Dark = íconos claros).
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Claro por defecto (más legible); el oscuro se elige a mano y se recuerda.
  const [isDark, setIsDark] = useState<boolean>(false);

  // Cargar preferencia guardada al iniciar
  useEffect(() => {
    (async () => {
      try {
        await openDB();
        const saved = await getLocalSetting('theme'); // '', 'dark' o 'light'
        if (saved === 'dark' || saved === 'light') {
          const dark = saved === 'dark';
          setIsDark(dark);
          applyDark(dark);
        } else {
          // sin preferencia guardada → claro por defecto
          applyDark(isDark);
        }
      } catch {
        applyDark(isDark);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      applyDark(next);
      openDB().then(() => setLocalSetting('theme', next ? 'dark' : 'light')).catch(() => {});
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ isDark, toggleDark }}>{children}</Ctx.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
};
