// ═══════════════════════════════════════════════════════════════════════════
// Cierre de Caja por TURNOS de 8 horas:
//   Turno 1 (Mañana): 06:00 → 14:00
//   Turno 2 (Tarde):  14:00 → 22:00
//   Turno 3 (Noche):  22:00 → 06:00 del día siguiente (cruza medianoche)
// Muestra el turno actual por defecto, con botones para ver los otros dos.
// El arqueo de efectivo es POR TURNO. Solo lectura sobre ventas_ventas.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { IonContent } from '@ionic/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../context/VentasContext';
import { Card, StatCard, SectionTitle, EmptyState, Skeleton } from '../components/ui';
import { BanknotesIcon, ArrowPathIcon } from '../components/ui/icons';

interface VentaRow { id: string; total: number; metodo_pago: string; fecha: string; fiado: boolean; }
type TurnoId = 'manana' | 'tarde' | 'noche';
interface Turno { id: TurnoId; nombre: string; emoji: string; startHour: number; endHour: number; }

const TURNOS: Turno[] = [
  { id: 'manana', nombre: 'Mañana', emoji: '🌅', startHour: 6,  endHour: 14 },
  { id: 'tarde',  nombre: 'Tarde',  emoji: '☀️', startHour: 14, endHour: 22 },
  { id: 'noche',  nombre: 'Noche',  emoji: '🌙', startHour: 22, endHour: 6  },
];

function rangoTurno(turno: Turno, ahora: Date): { inicio: Date; fin: Date } {
  const inicio = new Date(ahora);
  const fin = new Date(ahora);
  if (turno.id !== 'noche') {
    inicio.setHours(turno.startHour, 0, 0, 0);
    fin.setHours(turno.endHour, 0, 0, 0);
    return { inicio, fin };
  }
  const h = ahora.getHours();
  if (h >= 22) {
    inicio.setHours(22, 0, 0, 0);
    fin.setDate(fin.getDate() + 1);
    fin.setHours(6, 0, 0, 0);
  } else {
    inicio.setDate(inicio.getDate() - 1);
    inicio.setHours(22, 0, 0, 0);
    fin.setHours(6, 0, 0, 0);
  }
  return { inicio, fin };
}

function turnoActual(ahora: Date): TurnoId {
  const h = ahora.getHours();
  if (h >= 6 && h < 14) return 'manana';
  if (h >= 14 && h < 22) return 'tarde';
  return 'noche';
}

const metodoLabel = (k: string) =>
  ({ efectivo: '💵 Efectivo', transferencia: '📱 Transferencia', tarjeta: '💳 Tarjeta', qr: '📲 QR' } as Record<string, string>)[k] ?? k;

const CierrePage: React.FC = () => {
  const { comercio, sucursalActiva } = useAuth();
  const [ventas, setVentas]   = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [efectivoContado, setEfectivoContado] = useState('');
  const [selTurno, setSelTurno] = useState<TurnoId>(() => turnoActual(new Date()));

  const turno = TURNOS.find(t => t.id === selTurno)!;
  const { inicio, fin } = useMemo(() => rangoTurno(turno, new Date()), [turno]);

  const load = useCallback(async () => {
    if (!comercio) { setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from('ventas_ventas').select('id, total, metodo_pago, fecha, fiado')
      .eq('comercio_id', comercio.id)
      .gte('fecha', inicio.toISOString())
      .lt('fecha', fin.toISOString());
    if (sucursalActiva) q = q.eq('sucursal_id', sucursalActiva.id);
    const { data } = await q.order('fecha', { ascending: false });
    setVentas((data ?? []) as VentaRow[]);
    setLoading(false);
  }, [comercio, sucursalActiva, inicio, fin]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setEfectivoContado(''); }, [selTurno]);

  const total      = useMemo(() => ventas.reduce((s, v) => s + v.total, 0), [ventas]);
  const cantidad   = ventas.length;
  const ticketProm = cantidad > 0 ? total / cantidad : 0;

  const porMetodo = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of ventas) m[v.metodo_pago] = (m[v.metodo_pago] ?? 0) + v.total;
    return m;
  }, [ventas]);

  const totalEfectivo = porMetodo['efectivo'] ?? 0;
  const totalFiado    = useMemo(() => ventas.filter(v => v.fiado).reduce((s, v) => s + v.total, 0), [ventas]);

  const contado = parseFloat(efectivoContado) || 0;
  const diferencia = efectivoContado === '' ? null : contado - totalEfectivo;

  const esTurnoActual = selTurno === turnoActual(new Date());
  const fmtHora = (d: Date) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>🧾 Cierre de caja</h1>
          <button onClick={load} className="pressable" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <ArrowPathIcon size={16} color="var(--text-2)" />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          {sucursalActiva ? `${sucursalActiva.nombre} · ` : ''}Turno {turno.nombre.toLowerCase()} ({fmtHora(inicio)}–{fmtHora(fin)})
          {esTurnoActual && <span style={{ color: 'var(--color-primary-dark)', fontWeight: 600 }}> · en curso</span>}
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {TURNOS.map(t => {
            const activo = t.id === selTurno;
            const esActual = t.id === turnoActual(new Date());
            return (
              <button key={t.id} onClick={() => setSelTurno(t.id)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'inherit',
                  border: activo ? '1.5px solid var(--color-primary)' : '1px solid var(--border)',
                  background: activo ? 'var(--color-primary-bg)' : 'var(--surface)',
                  color: activo ? 'var(--color-primary-dark)' : 'var(--text-2)',
                  fontWeight: 600, fontSize: 13, position: 'relative',
                }}>
                <div style={{ fontSize: 16 }}>{t.emoji}</div>
                <div>{t.nombre}</div>
                {esActual && <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)' }} />}
              </button>
            );
          })}
        </div>

        {loading ? (
          <><Skeleton height={70} style={{ marginBottom: 8 }} /><Skeleton height={140} style={{ marginBottom: 8 }} /><Skeleton height={120} /></>
        ) : cantidad === 0 ? (
          <EmptyState icon={<BanknotesIcon size={44} color="var(--text-3)" />} title={`Sin ventas en el turno ${turno.nombre.toLowerCase()}`} description="Cuando haya ventas en este turno, vas a ver el cierre acá." />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              <StatCard label="Ventas" value={cantidad} />
              <StatCard label="Total" value={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{formatMoney(total)}</span>} color="var(--color-primary-dark)" />
              <StatCard label="Ticket prom." value={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{formatMoney(ticketProm)}</span>} />
            </div>

            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>Ingresos por método</SectionTitle>
              {Object.entries(porMetodo).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14 }}>{metodoLabel(k)}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(v)}</span>
                </div>
              ))}
              {totalFiado > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', color: 'var(--color-warning-dark)' }}>
                  <span style={{ fontSize: 14 }}>📒 Fiado (no cobrado)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(totalFiado)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4, borderTop: '2px solid var(--border)' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>TOTAL</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 17, color: 'var(--color-primary-dark)' }}>{formatMoney(total)}</span>
              </div>
            </Card>

            <Card>
              <SectionTitle>Arqueo de efectivo · turno {turno.nombre.toLowerCase()}</SectionTitle>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                Contá el efectivo en la caja al cerrar este turno y anotalo para verificar que cuadre.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>Efectivo esperado</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(totalEfectivo)}</span>
              </div>
              <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Efectivo contado en caja</label>
              <input type="number" inputMode="decimal" value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: 12, fontSize: 18, textAlign: 'center', fontFamily: 'var(--font-mono)', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }} />

              {diferencia !== null && (
                <div style={{
                  marginTop: 12, padding: '12px 14px', borderRadius: 'var(--radius)',
                  background: Math.abs(diferencia) < 0.01 ? 'var(--color-primary-bg)' : diferencia > 0 ? 'var(--color-info-bg)' : 'var(--color-danger-bg)',
                  border: `1px solid ${Math.abs(diferencia) < 0.01 ? 'var(--color-primary-border)' : diferencia > 0 ? 'var(--color-info-border)' : 'var(--color-danger-border)'}`,
                  textAlign: 'center',
                }}>
                  {Math.abs(diferencia) < 0.01 ? (
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary-dark)' }}>✅ La caja cuadra perfecto</span>
                  ) : diferencia > 0 ? (
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-info-dark)' }}>Sobran {formatMoney(diferencia)} en caja</span>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger-dark)' }}>Faltan {formatMoney(Math.abs(diferencia))} en caja</span>
                  )}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </IonContent>
  );
};

export default CierrePage;
