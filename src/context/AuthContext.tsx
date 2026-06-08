// ═══════════════════════════════════════════════════════════════════════════
// Auth COMPARTIDA con Stockly. Misma cuenta = mismas dos apps.
// Al loguearse trae comercio (vía miembros) y sucursales.
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_ENABLED, signIn, signUp, signOut, supabaseErrorMsg } from '../lib/supabase';
import { Comercio, Sucursal, Miembro } from '../types';
import { setLocalSetting, getLocalSetting, openDB } from '../lib/outbox';

interface AuthState {
  user: User | null;
  session: Session | null;
  miembro: Miembro | null;
  comercio: Comercio | null;
  sucursales: Sucursal[];
  sucursalActiva: Sucursal | null;
  loading: boolean;
}

interface AuthCtx extends AuthState {
  login:    (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, nombre: string, nombreComercio: string) => Promise<string | null>;
  logout:   () => Promise<void>;
  setSucursalActiva: (s: Sucursal) => void;
  planBloqueado: boolean;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [st, setSt] = useState<AuthState>({
    user: null, session: null, miembro: null, comercio: null,
    sucursales: [], sucursalActiva: null, loading: true,
  });

  useEffect(() => {
    if (!SUPABASE_ENABLED) { setSt(s => ({ ...s, loading: false })); return; }

    let resolved = false;
    const finish = () => { resolved = true; };

    // Safety net: si Supabase no responde en 8s, dejar de cargar igual
    // (evita el spinner infinito si hay problemas de red o credenciales).
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn('[Auth] getSession timeout — mostrando login');
        setSt(s => ({ ...s, loading: false }));
      }
    }, 8000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        finish();
        setSt(s => ({ ...s, session, user: session?.user ?? null }));
        if (session?.user) loadComercio(session.user.id);
        else setSt(s => ({ ...s, loading: false }));
      })
      .catch((err) => {
        finish();
        console.error('[Auth] getSession error:', err);
        setSt(s => ({ ...s, loading: false }));
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      finish();
      setSt(s => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) loadComercio(session.user.id);
      else setSt(s => ({ ...s, miembro: null, comercio: null, sucursales: [], sucursalActiva: null, loading: false }));
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const loadComercio = async (userId: string) => {
    try {
      // miembro → comercio_id
      const { data: miembro, error: mErr } = await supabase
        .from('miembros').select('*').eq('user_id', userId).maybeSingle();
      if (mErr) console.error('[Auth] miembros error:', mErr.message);
      if (!miembro) {
        // Usuario sin comercio asociado — no dejar cargando para siempre
        console.warn('[Auth] usuario sin miembro/comercio');
        setSt(s => ({ ...s, loading: false }));
        return;
      }

      // comercio
      const { data: comercio } = await supabase
        .from('comercios').select('*').eq('id', miembro.comercio_id).maybeSingle();

      // sucursales activas del comercio
      const { data: sucursales } = await supabase
        .from('sucursales').select('*')
        .eq('comercio_id', miembro.comercio_id).eq('activa', true)
        .order('nombre');

      // recuperar última sucursal usada (o la primera).
      // openDB defensivo: loadComercio corre ANTES de montar VentasProvider,
      // así que la IndexedDB puede no estar abierta todavía.
      let savedId = '';
      try {
        await openDB();
        savedId = await getLocalSetting('sucursal-activa');
      } catch (e) {
        console.warn('[Auth] no se pudo leer sucursal guardada:', e);
      }

      const lista = (sucursales ?? []) as Sucursal[];
      const activa = lista.find(s => s.id === savedId) ?? lista[0] ?? null;

      setSt(s => ({
        ...s,
        miembro: miembro as Miembro,
        comercio: (comercio as Comercio) ?? null,
        sucursales: lista,
        sucursalActiva: activa,
        loading: false,
      }));
    } catch (err) {
      console.error('[Auth] loadComercio error:', err);
      setSt(s => ({ ...s, loading: false }));
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    return error ? supabaseErrorMsg(error) : null;
  };

  const register = async (email: string, password: string, nombre: string, nombreComercio: string) => {
    const { error } = await signUp(email, password, nombre, nombreComercio);
    return error ? supabaseErrorMsg(error) : null;
  };

  const logout = async () => {
    await signOut();
    setSt({ user: null, session: null, miembro: null, comercio: null, sucursales: [], sucursalActiva: null, loading: false });
  };

  const setSucursalActiva = (s: Sucursal) => {
    openDB().then(() => setLocalSetting('sucursal-activa', s.id)).catch(() => {});
    setSt(prev => ({ ...prev, sucursalActiva: s }));
  };

  // plan: trial / activo → permitido; suspendido → bloqueado
  const planBloqueado = st.comercio?.plan === 'suspendido';

  return (
    <AuthContext.Provider value={{ ...st, login, register, logout, setSucursalActiva, planBloqueado }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
