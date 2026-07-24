// ═══════════════════════════════════════════════════════════════════════════
// Login / Registro — usa la misma cuenta de Stockly (Supabase Auth compartida).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { IonContent } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from './ui';
import { ShoppingCartIcon } from './ui/icons';

const LoginScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [nombre, setNombre]   = useState('');
  const [comercio, setComercio] = useState('');
  const [codigoInv, setCodigoInv] = useState(''); // código de invitación (empleado)
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const conCodigo = codigoInv.trim().length > 0;

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    const err = mode === 'login'
      ? await login(email.trim(), password)
      : await register(email.trim(), password, nombre.trim(), comercio.trim(), codigoInv.trim() || undefined);
    setLoading(false);
    if (err) setError(err);
  };

  const valid = mode === 'login'
    ? email.includes('@') && password.length >= 6
    : email.includes('@') && password.length >= 6 && nombre.trim() && (conCodigo || comercio.trim());

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, var(--amber-300), var(--amber-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)', boxShadow: 'var(--shadow-md), var(--glow-strong)' }}>
          <ShoppingCartIcon size={34} color="#2a1a00" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, letterSpacing: '.04em', textTransform: 'uppercase' }}>Almacén Ventas</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 'var(--space-6)', textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
          {mode === 'login' ? 'Ingresá con tu cuenta de Stockly' : 'Creá tu cuenta — sirve para Stockly también'}
        </p>

        <div style={{ width: '100%', maxWidth: 320 }}>
          {mode === 'register' && (
            <>
              <Input label="Tu nombre" value={nombre} onChange={setNombre} placeholder="Juan Pérez" />
              {!conCodigo && (
                <Input label="Nombre del comercio" value={comercio} onChange={setComercio} placeholder="Almacén Don Juan" />
              )}
              <Input label="Código de invitación (opcional)" value={codigoInv} onChange={v => setCodigoInv(v.toUpperCase())} placeholder="EJ: AB23CD45" />
              {conCodigo && (
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '-4px 0 12px', lineHeight: 1.5 }}>
                  Te vas a unir como empleado al comercio del dueño que te invitó.
                </p>
              )}
            </>
          )}
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="tu@email.com" inputMode="email" />
          <Input label="Contraseña" value={password} onChange={setPass} type="password" placeholder="Mínimo 6 caracteres" />

          {error && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, color: 'var(--color-danger-dark)', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <Button fullWidth size="lg" onClick={handleSubmit} disabled={!valid} loading={loading}>
            {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </Button>

          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ width: '100%', marginTop: 16, background: 'none', border: 'none', fontSize: 14, color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
          >
            {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
          </button>
        </div>
      </div>
    </IonContent>
  );
};

export default LoginScreen;
