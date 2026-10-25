// ═══════════════════════════════════════════════════════════════════════════
// Escala de tipografía / tamaño de interfaz, elegible por el usuario.
// Se aplica con `zoom` (escala texto + UI proporcional, compatible con CSS px).
// Persiste en IndexedDB, igual que el tema.
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { TextZoom } from '@capacitor/text-zoom';
import { openDB, getLocalSetting, setLocalSetting } from '../lib/outbox';

export const ESCALA_MIN = 0.85;
export const ESCALA_MAX = 1.5;
// 110%: la app apunta a gente grande; cada uno puede cambiarla en Ajustes.
const ESCALA_DEFAULT = 1.1;
const KEY = 'fontScale';

interface FontScaleCtx {
  escala: number;
  setEscala: (v: number) => void;
}

const Ctx = createContext<FontScaleCtx | undefined>(undefined);

function aplicar(v: number) {
  const e = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v));
  (document.documentElement.style as CSSStyleDeclaration & { zoom?: string }).zoom =
    e === 1 ? '' : String(e);
}

export const FontScaleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [escala, setEscalaState] = useState<number>(ESCALA_DEFAULT);

  // Cargar la preferencia guardada al iniciar
  useEffect(() => {
    (async () => {
      try {
        await openDB();
        const saved = parseFloat(await getLocalSetting(KEY));
        // Android ya agranda el texto con el "Tamaño de fuente" del sistema: si la persona
        // lo subió, arrancamos en 100% para no sumarle nuestro 110% (se saldría de pantalla).
        let sugerida = ESCALA_DEFAULT;
        if (Number.isNaN(saved) && Capacitor.isNativePlatform()) {
          try { if ((await TextZoom.getPreferred()).value > 1.05) sugerida = 1; } catch { /* sin plugin */ }
        }
        const e = Number.isNaN(saved) ? sugerida : Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, saved));
        setEscalaState(e);
        aplicar(e);
      } catch { aplicar(ESCALA_DEFAULT); }
    })();
  }, []);

  const setEscala = useCallback((v: number) => {
    const e = Math.round(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v)) * 100) / 100;
    setEscalaState(e);
    aplicar(e);
    openDB().then(() => setLocalSetting(KEY, String(e))).catch(() => {});
  }, []);

  return <Ctx.Provider value={{ escala, setEscala }}>{children}</Ctx.Provider>;
};

export const useFontScale = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFontScale must be inside FontScaleProvider');
  return ctx;
};
