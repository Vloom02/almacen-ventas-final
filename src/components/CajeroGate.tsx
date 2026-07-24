// ═══════════════════════════════════════════════════════════════════════════
// Inicio de turno: si el comercio tiene cajeros definidos, hay que iniciar turno
// con legajo + contraseña para poder vender. El dueño entra con su PIN (admin).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { IonContent } from '@ionic/react';
import { useEmpleado } from '../context/EmpleadoContext';
import { useOwner } from '../context/OwnerContext';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from './ui';
import { LockClosedIcon } from './ui/icons';
import PinPad from './PinPad';

const CajeroGate: React.FC = () => {
  const { comercio } = useAuth();
  const { empleados, iniciarTurno, entrarComoAdmin } = useEmpleado();
  const { hasPin, tryUnlock } = useOwner();
  const [legajo, setLegajo] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const activos = empleados.filter(e => e.activo !== false);

  const entrar = async () => {
    if (!legajo.trim() || !pass) { setError('Completá legajo y contraseña'); return; }
    setError(''); setLoading(true);
    const err = await iniciarTurno(legajo.trim(), pass);
    setLoading(false);
    if (err) { setError(err); setPass(''); }
  };

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)', paddingTop: 'calc(var(--space-6) + var(--ion-safe-area-top, 0px))' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🛒</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', textAlign: 'center' }}>Iniciá tu turno</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 'var(--space-5)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
          {comercio?.nombre ?? 'El comercio'} — ingresá con tu legajo y contraseña para registrar tus ventas.
        </p>

        <div style={{ width: '100%', maxWidth: 320 }}>
          {/* Selector rápido por nombre */}
          {activos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
              {activos.map(e => (
                <button key={e.id} type="button" onClick={() => { setLegajo(e.legajo); setError(''); }}
                  className="pressable"
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    border: legajo === e.legajo ? '1.5px solid var(--color-primary)' : '1px solid var(--border)',
                    background: legajo === e.legajo ? 'var(--color-primary-bg)' : 'var(--surface)',
                    color: legajo === e.legajo ? 'var(--color-primary-dark)' : 'var(--text-2)' }}>
                  {e.nombre} <span style={{ opacity: .6, fontFamily: 'var(--font-mono)' }}>#{e.legajo}</span>
                </button>
              ))}
            </div>
          )}

          <Input label="Legajo" value={legajo} onChange={setLegajo} placeholder="Tu número de legajo" inputMode="text" />
          <Input label="Contraseña" value={pass} onChange={setPass} type="password" placeholder="Tu contraseña" />

          {error && <p style={{ fontSize: 13, color: 'var(--color-danger)', margin: '4px 0 10px', textAlign: 'center' }}>{error}</p>}

          <Button fullWidth size="lg" onClick={entrar} loading={loading} disabled={!legajo.trim() || !pass} style={{ marginTop: 8 }}>
            Iniciar turno
          </Button>

          {/* Acceso del dueño */}
          {hasPin && (
            <button type="button" onClick={() => setShowPin(true)}
              style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <LockClosedIcon size={15} /> Soy el dueño (entrar con PIN)
            </button>
          )}
        </div>
      </div>

      {showPin && (
        <PinPad
          mode="unlock"
          onSuccess={async (pin) => {
            const ok = await tryUnlock(pin);
            if (ok) { entrarComoAdmin(); setShowPin(false); }
            return ok;
          }}
          onCancel={() => setShowPin(false)}
        />
      )}
    </IonContent>
  );
};

export default CajeroGate;
