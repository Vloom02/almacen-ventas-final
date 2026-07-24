import { createClient } from '@supabase/supabase-js';

// Acepta ambos nombres por compatibilidad con el .env de Stockly
const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL ?? '') as string;
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY
                    ?? import.meta.env.VITE_SUPABASE_ANON
                    ?? '') as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('⚠️  Supabase env vars no configuradas — sync deshabilitado');
}

// Fallback a placeholders si faltan las env (tests/CI): así importar este módulo
// nunca tira "supabaseUrl is required". El uso real se gatea con SUPABASE_ENABLED.
export const supabase = createClient(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON || 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
);

export const SUPABASE_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON);

// ─── Auth (compartida con Stockly) ────────────────────────────────────────────
export const signIn  = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });
export const signUp  = (email: string, password: string, nombre: string, nombreComercio: string, codigoInvitacion?: string) =>
  supabase.auth.signUp({
    email, password,
    options: {
      data: codigoInvitacion
        ? { nombre, codigo_invitacion: codigoInvitacion } // empleado: se une al comercio del código
        : { nombre, nombre_comercio: nombreComercio },    // dueño: crea su comercio
    },
  });
export const signOut = () => supabase.auth.signOut();
export const getSession = () => supabase.auth.getSession();

// ─── Mensajes de error en español ─────────────────────────────────────────────
export function supabaseErrorMsg(err: { message?: string } | null): string {
  if (!err?.message) return 'Error desconocido';
  const m = err.message.toLowerCase();
  if (m.includes('invalid login'))     return 'Email o contraseña incorrectos';
  if (m.includes('user already'))      return 'Ya existe una cuenta con ese email';
  if (m.includes('email not confirmed')) return 'Confirmá tu email antes de ingresar';
  if (m.includes('password'))          return 'La contraseña debe tener al menos 6 caracteres';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexión. Verificá tu internet';
  return err.message;
}
