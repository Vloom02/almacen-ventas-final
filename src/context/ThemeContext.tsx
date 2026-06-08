// ═══════════════════════════════════════════════════════════════════════════
// Tema claro/oscuro. Togglea la clase `body.dark` y persiste en IndexedDB.
// Si el usuario nunca eligió, sigue la preferencia del sistema.
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { openDB, getLocalSetting, setLocalSetting } from '../lib/outbox';

interface ThemeCtx {
  isDark: boolean;
  toggleDark: () => void;
}

const Ctx = createContext<ThemeCtx | undefined>(undefined);

function applyDark(dark: boolean) {
  document.body.classList.toggle('dark', dark);
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estado inicial: lo que diga el sistema, hasta que carguemos la preferencia guardada
  const [isDark, setIsDark] = useState<boolean>(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  );

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
          // sin preferencia guardada → seguir el sistema
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
