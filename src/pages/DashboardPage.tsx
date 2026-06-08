// ═══════════════════════════════════════════════════════════════════════════
// Dashboard de ventas del día. Lee ventas_ventas + ventas_items de la base.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState, useMemo } from 'react';
import { IonContent } from '@ionic/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../context/VentasContext';
import { Card, StatCard, SectionTitle, EmptyState, Skeleton } from '../components/ui';
import { ChartBarIcon, ArrowPathIcon } from '../components/ui/icons';

interface VentaRow { id: string; total: number; metodo_pago: string; cliente: string; fecha: string; }
interface ItemRow  { producto_id: string; cantidad: number; subtotal: number; }

const DashboardPage: React.FC = () => {
  const { comercio } = useAuth();
  const [ventas, setVentas]   = useState<VentaRow[]>([]);
  const [items, setItems]     = useState<ItemRow[]>([]);
  const [productos, setProds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState<'hoy' | 'semana'>('hoy');

  const load = async () => {
    if (!comercio) { setLoading(false); return; }
    setLoading(true);
    const inicio = new Date();
    if (range === 'hoy') inicio.setHours(0, 0, 0, 0);
    else inicio.setDate(inicio.getDate() - 7);

    const { data: vData } = await supabase
      .from('ventas_ventas').select('*')
      .eq('comercio_id', comercio.id)
      .gte('fecha', inicio.toISOString())
      .order('fecha', { ascending: false });

    const ventasList = (vData ?? []) as VentaRow[];
    setVentas(ventasList);

    if (ventasList.length > 0) {
      const ids = ventasList.map(v => v.id);
      const { data: iData } = await supabase
        .from('ventas_items').select('producto_id, cantidad, subtotal')
        .in('venta_id', ids);
      setItems((iData ?? []) as ItemRow[]);

      const prodIds = [...new Set((iData ?? []).map(i => i.producto_id).filter(Boolean))];
      if (prodIds.length > 0) {
        const { data: pData } = await supabase
          .from('productos').select('id, nombre').in('id', prodIds);
        const map: Record<string, string> = {};
        for (const p of pData ?? []) map[p.id] = p.nombre;
        setProds(map);
      }
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [comercio, range]);

  const total = useMemo(() => ventas.reduce((s, v) => s + v.total, 0), [ventas]);
  const ticketProm = useMemo(() => ventas.length > 0 ? total / ventas.length : 0, [total, ventas.length]);

  const porMetodo = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of ventas) m[v.metodo_pago] = (m[v.metodo_pago] ?? 0) + v.total;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [ventas]);

  const topProductos = useMemo(() => {
    const m: Record<string, { qty: number; total: number }> = {};
    for (const it of items) {
      if (!it.producto_id) continue;
      if (!m[it.producto_id]) m[it.producto_id] = { qty: 0, total: 0 };
      m[it.producto_id].qty += it.cantidad;
      m[it.producto_id].total += it.subtotal;
    }
    return Object.entries(m).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [items]);

  const metodoLabel = (k: string) => ({ efectivo: '💵 Efectivo', transferencia: '📱 Transferencia', tarjeta: '💳 Tarjeta', qr: '📲 QR' } as Record<string, string>)[k] ?? k;

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 90 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>📊 Dashboard</h1>
          <button onClick={load} className="pressable" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: 8, cursor: 'pointer', display: 'flex' }}>
            <ArrowPathIcon size={16} color="var(--text-2)" />
          </button>
        </div>

        {/* Range toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['hoy', 'semana'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ flex: 1, padding: 8, border: range === r ? '1.5px solid var(--color-primary)' : '1px solid var(--border)', borderRadius: 'var(--radius)', background: range === r ? 'var(--color-primary-bg)' : 'var(--surface)', color: range === r ? 'var(--color-primary-dark)' : 'var(--text-2)', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>
              {r === 'hoy' ? 'Hoy' : 'Últimos 7 días'}
            </button>
          ))}
        </div>

        {loading ? (
          <><Skeleton height={70} style={{ marginBottom: 8 }} /><Skeleton height={120} style={{ marginBottom: 8 }} /><Skeleton height={120} /></>
        ) : ventas.length === 0 ? (
          <EmptyState icon={<ChartBarIcon size={44} color="var(--text-3)" />} title="Sin ventas todavía" description={range === 'hoy' ? 'No hubo ventas hoy' : 'No hubo ventas esta semana'} />
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              <StatCard label="Ventas" value={ventas.length} />
              <StatCard label="Total" value={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{formatMoney(total)}</span>} color="var(--color-primary-dark)" />
              <StatCard label="Ticket prom." value={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 15 }}>{formatMoney(ticketProm)}</span>} />
            </div>

            {/* Por método */}
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>Por método de pago</SectionTitle>
              {porMetodo.map(([k, v]) => {
                const pct = Math.round((v / total) * 100);
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{metodoLabel(k)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatMoney(v)} <span style={{ color: 'var(--text-3)' }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 'var(--radius-full)', transition: 'width .4s' }} />
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Top productos */}
            <Card>
              <SectionTitle>Top 5 productos</SectionTitle>
              {topProductos.length === 0 ? (
                <div style={{ color: 'var(--text-2)', fontSize: 13, padding: 12, textAlign: 'center' }}>Sin datos</div>
              ) : topProductos.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < topProductos.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                    <div style={{ fontSize: 14, marginLeft: 10 }}>{productos[p.id] ?? '—'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{p.qty} u.</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-mono)' }}>{formatMoney(p.total)}</span>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
      </div>
    </IonContent>
  );
};

export default DashboardPage;
