// ═══════════════════════════════════════════════════════════════════════════
// Hub "Más": agrupa las secciones del DUEÑO en una grilla clara, para despejar
// la barra inferior (Venta · Stock · Más).
// Si quien trabaja es un EMPLEADO (cajero no-admin), no ve nada de eso: solo
// puede cerrar su turno. El dueño entra como admin (PIN) y ve todo.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEmpleado } from '../context/EmpleadoContext';

interface Tile { emoji: string; label: string; desc: string; path: string; }

const TILES: Tile[] = [
  { emoji: '📊', label: 'Dashboard', desc: 'Ventas y números del día', path: '/dashboard' },
  { emoji: '🧾', label: 'Caja',      desc: 'Cierre y arqueo por turno', path: '/caja' },
  { emoji: '📋', label: 'Historial', desc: 'Ventas y devoluciones',      path: '/historial' },
  { emoji: '📒', label: 'Deudas',    desc: 'Fiado y pagos',              path: '/deudas' },
  { emoji: '📈', label: 'Estadísticas', desc: 'Top vendidos y horas pico', path: '/estadisticas' },
  { emoji: '🎁', label: 'Promos',    desc: '2x1 y % por cantidad',       path: '/promos' },
  { emoji: '👥', label: 'Cajeros',   desc: 'Empleados de caja',          path: '/cajeros' },
];

const MasPage: React.FC = () => {
  const history = useHistory();
  const { comercio, logout } = useAuth();
  const { cajero, cerrarTurno } = useEmpleado();

  // Es "dueño" si no hay sistema de cajeros activo, o si entró como admin (PIN).
  const esDueno = !cajero || cajero.admin === true;

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 'calc(90px + var(--sab,env(safe-area-inset-bottom)))', paddingTop: 'calc(var(--space-4) + var(--ion-safe-area-top, 0px))' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{comercio?.nombre ?? 'Más'}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          {cajero && !cajero.admin ? `Estás en tu turno, ${cajero.nombre}` : 'Secciones del dueño (piden PIN)'}
        </p>

        {esDueno ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {TILES.map(t => (
                <button key={t.path} type="button" onClick={() => history.push(t.path)} className="pressable"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '16px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', boxShadow: 'var(--shadow-sm)' }}>
                  <span style={{ fontSize: 30, lineHeight: 1 }}>{t.emoji}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.3 }}>{t.desc}</span>
                </button>
              ))}
            </div>

            {cajero?.admin && (
              <button type="button" onClick={() => { if (window.confirm('¿Cerrar turno de administrador?')) cerrarTurno(); }}
                style={{ width: '100%', marginTop: 14, padding: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cerrar turno (administrador)
              </button>
            )}
            <button type="button" onClick={() => { if (window.confirm('¿Cerrar sesión del comercio?')) logout(); }}
              style={{ width: '100%', marginTop: 10, padding: 13, borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'none', color: 'var(--color-danger)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cerrar sesión
            </button>
          </>
        ) : (
          // Empleado: maneja su caja y cierra al salir.
          <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🧾</div>
            <p style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 290, margin: '0 auto 18px', lineHeight: 1.5 }}>
              Manejá el efectivo de tu turno (apertura, ingresos y egresos) y cerrá la caja al terminar.
            </p>
            <button type="button" onClick={() => history.push('/caja-turno')} className="pressable"
              style={{ width: '100%', maxWidth: 320, padding: '13px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
              💵 Caja del turno (apertura / movimientos)
            </button>
            <button type="button" onClick={() => history.push('/cerrar-caja')} className="pressable"
              style={{ width: '100%', maxWidth: 320, padding: '13px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--color-primary)', color: '#2a1a00', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              🧾 Cerrar caja y salir
            </button>
          </div>
        )}
      </div>
    </IonContent>
  );
};

export default MasPage;
