// ═══════════════════════════════════════════════════════════════════════════
// Modo Dueño protegido por PIN (escenario cuenta compartida).
// - El PIN se guarda HASHEADO (SHA-256) en ventas_config, nunca en texto plano.
// - Si no hay PIN configurado, el dueño lo crea la primera vez.
// - Una vez desbloqueado, se re-bloquea solo tras 5 min de inactividad.
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const LOCK_MS = 5 * 60 * 1000; // 5 minutos de inactividad

// SHA-256 con la Web Crypto API (disponible en el WebView de Capacitor)
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface OwnerCtx {
  hasPin: boolean;        // ya hay un PIN configurado en este comercio
  isUnlocked: boolean;    // modo dueño activo ahora
  loading: boolean;
  setPin:    (pin: string) => Promise<boolean>;   // crear/cambiar PIN (debe estar desbloqueado o ser primera vez)
  tryUnlock: (pin: string) => Promise<boolean>;   // verificar PIN e ingresar a modo dueño
  lock:      () => void;                           // salir de modo dueño
  keepAlive: () => void;                           // resetea el timer de inactividad
}

const Ctx = createContext<OwnerCtx | undefined>(undefined);

export const OwnerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { comercio } = useAuth();
  const [hasPin, setHasPin]       = useState(false);
  const [isUnlocked, setUnlocked] = useState(false);
  const [loading, setLoading]     = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar si el comercio ya tiene PIN configurado
  useEffect(() => {
    (async () => {
      if (!comercio) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data } = await supabase
          .from('ventas_config').select('pin_hash')
          .eq('comercio_id', comercio.id).maybeSingle();
        setHasPin(!!data?.pin_hash);
      } catch {
        setHasPin(false);
      }
      setUnlocked(false);
      setLoading(false);
    })();
  }, [comercio]);

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

  const lock = useCallback(() => {
    clearTimer();
    setUnlocked(false);
  }, []);

  const keepAlive = useCallback(() => {
    if (!isUnlocked) return;
    clearTimer();
    timerRef.current = setTimeout(() => setUnlocked(false), LOCK_MS);
  }, [isUnlocked]);

  // Arrancar timer al desbloquear
  useEffect(() => {
    if (isUnlocked) keepAlive();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  const setPin = useCallback(async (pin: string) => {
    if (!comercio || pin.length < 4) return false;
    try {
      const pin_hash = await sha256(pin);
      const { error } = await supabase.from('ventas_config').upsert({
        comercio_id: comercio.id, pin_hash, updated_at: new Date().toISOString(),
      });
      if (error) { console.error('[owner] setPin:', error.message); return false; }
      setHasPin(true);
      setUnlocked(true); // al crear el PIN, queda en modo dueño
      return true;
    } catch (e) {
      console.error('[owner] setPin error:', e);
      return false;
    }
  }, [comercio]);

  const tryUnlock = useCallback(async (pin: string) => {
    if (!comercio) return false;
    try {
      const { data } = await supabase
        .from('ventas_config').select('pin_hash')
        .eq('comercio_id', comercio.id).maybeSingle();
      if (!data?.pin_hash) return false;
      const hash = await sha256(pin);
      if (hash === data.pin_hash) { setUnlocked(true); return true; }
      return false;
    } catch (e) {
      console.error('[owner] tryUnlock error:', e);
      return false;
    }
  }, [comercio]);

  return (
    <Ctx.Provider value={{ hasPin, isUnlocked, loading, setPin, tryUnlock, lock, keepAlive }}>
      {children}
    </Ctx.Provider>
  );
};

export const useOwner = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOwner must be inside OwnerProvider');
  return ctx;
};
