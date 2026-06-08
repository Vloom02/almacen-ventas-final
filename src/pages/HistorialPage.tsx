// ═══════════════════════════════════════════════════════════════════════════
// Historial de ventas — lee ventas_ventas con sus items. Filtros + export CSV.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState, useMemo } from 'react';
import { IonContent } from '@ionic/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../context/VentasContext';
import { Card, Badge, EmptyState, Skeleton, Button } from '../components/ui';
import { ClipboardIcon, FunnelIcon, DocumentIcon } from '../components/ui/icons';
import { HistoryFilters } from '../types';

interface VentaRow { id: string; total: number; descuento: number; metodo_pago: string; cliente: string; fiado: boolean; usuario: string; fecha: string; }

const SaleCard: React.FC<{ venta: VentaRow }> = ({ venta }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ cantidad: number; precio_unit: number; subtotal: number; producto_id: string }[]>([]);
  const [prods, setProds] = useState<Record<string, string>>({});

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && items.length === 0) {
      const { data } = await supabase.from('ventas_items').select('*').eq('venta_id', venta.id);
      setItems(data ?? []);
      const ids = [...new Set((data ?? []).map(i => i.producto_id).filter(Boolean))];
      if (ids.length) {
        const { data: p } = await supabase.from('productos').select('id,nombre').in('id', ids);
        const m: Record<string, string> = {};
        for (const x of p ?? []) m[x.id] = x.nombre;
        setProds(m);
      }
    }
  };

  const time = new Date(venta.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const metodoLabel = ({ efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', qr: 'QR' } as Record<string, string>)[venta.metodo_pago] ?? venta.metodo_pago;

  return (
    <Card variant="bordered" style={{ padding: 0, overflow: 'hidden', marginBottom: 7 }}>
      <div onClick={toggle} className="pressable" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', cursor: 'pointer' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>🕐 {time} {venta.usuario && <Badge color="purple" style={{ marginLeft: 4, fontSize: 10 }}>{venta.usuario}</Badge>}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{metodoLabel}{venta.cliente ? ` · ${venta.cliente}` : ''}{venta.fiado ? ' · Fiado' : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-mono)' }}>{formatMoney(venta.total)}</span>
          <span style={{ color: 'var(--text-3)', fontSize: 18, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : '' }}>›</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', background: 'var(--surface-2)' }}>
          {items.length === 0 ? <Skeleton height={14} /> : items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
              <span>{prods[it.producto_id] ?? '—'} <span style={{ color: 'var(--text-3)' }}>x{it.cantidad}</span></span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(it.subtotal)}</span>
            </div>
          ))}
          {venta.descuento > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0', color: 'var(--color-primary-dark)' }}><span>Descuento</span><span style={{ fontFamily: 'var(--font-mono)' }}>-{formatMoney(venta.descuento)}</span></div>}
        </div>
      )}
    </Card>
  );
};

const HistorialPage: React.FC = () => {
  const { comercio } = useAuth();
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>({ metodoPago: '', cliente: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    (async () => {
      if (!comercio) { setLoading(false); return; }
      setLoading(true);
      const desde = new Date(); desde.setDate(desde.getDate() - 30);
      const { data } = await supabase.from('ventas_ventas').select('*')
        .eq('comercio_id', comercio.id).gte('fecha', desde.toISOString())
        .order('fecha', { ascending: false });
      setVentas((data ?? []) as VentaRow[]);
      setLoading(false);
    })();
  }, [comercio]);

  const filtered = useMemo(() => ventas
    .filter(v => !filters.metodoPago || v.metodo_pago === filters.metodoPago)
    .filter(v => !filters.cliente || (v.cliente ?? '').toLowerCase().includes(filters.cliente.toLowerCase()))
    .filter(v => !filters.dateFrom || v.fecha >= filters.dateFrom)
    .filter(v => !filters.dateTo || v.fecha <= filters.dateTo + 'T23:59:59'),
    [ventas, filters]);

  const total = useMemo(() => filtered.reduce((s, v) => s + v.total, 0), [filtered]);

  const grouped = useMemo(() => {
    const g: Record<string, VentaRow[]> = {};
    for (const v of filtered) {
      const k = new Date(v.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
      (g[k] ??= []).push(v);
    }
    return g;
  }, [filtered]);

  const exportCSV = () => {
    let csv = '\uFEFFFecha,Hora,Usuario,Cliente,Pago,Descuento,Total\n';
    for (const v of filtered) {
      const d = new Date(v.fecha);
      csv += `"${d.toLocaleDateString('es-AR')}","${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}","${v.usuario ?? ''}","${v.cliente ?? ''}","${v.metodo_pago}","${formatMoney(v.descuento)}","${formatMoney(v.total)}"\n`;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `ventas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const inputStyle: React.CSSProperties = { width: '100%', padding: 9, fontSize: 13, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', outline: 'none' };

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 90 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📋 Historial</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>Últimos 30 días</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
          <Card variant="bordered" style={{ padding: 10 }}><div style={{ fontSize: 11, color: 'var(--text-2)' }}>Ventas</div><div style={{ fontSize: 20, fontWeight: 700 }}>{filtered.length}</div></Card>
          <Card variant="bordered" style={{ padding: 10 }}><div style={{ fontSize: 11, color: 'var(--text-2)' }}>Total</div><div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', paddingTop: 2 }}>{formatMoney(total)}</div></Card>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button variant="secondary" onClick={exportCSV} style={{ flex: 1 }}><DocumentIcon size={16} /> CSV</Button>
          <Button variant={activeFilters > 0 ? 'primary' : 'secondary'} onClick={() => setShowFilters(!showFilters)} style={{ flex: 1 }}><FunnelIcon size={16} /> Filtros{activeFilters > 0 ? ` (${activeFilters})` : ''}</Button>
        </div>

        {showFilters && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 8 }}>
              <div><label style={{ fontSize: 12, color: 'var(--text-2)' }}>Pago</label>
                <select value={filters.metodoPago} onChange={e => setFilters(f => ({ ...f, metodoPago: e.target.value }))} style={inputStyle}>
                  <option value="">Todos</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option><option value="qr">QR</option>
                </select></div>
              <div><label style={{ fontSize: 12, color: 'var(--text-2)' }}>Cliente</label>
                <input value={filters.cliente} onChange={e => setFilters(f => ({ ...f, cliente: e.target.value }))} style={inputStyle} placeholder="Buscar..." /></div>
              <div><label style={{ fontSize: 12, color: 'var(--text-2)' }}>Desde</label>
                <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} style={inputStyle} /></div>
              <div><label style={{ fontSize: 12, color: 'var(--text-2)' }}>Hasta</label>
                <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} style={inputStyle} /></div>
            </div>
            <Button variant="ghost" size="sm" fullWidth onClick={() => setFilters({ metodoPago: '', cliente: '', dateFrom: '', dateTo: '' })}>Limpiar filtros</Button>
          </Card>
        )}

        {loading ? (
          <><Skeleton height={60} style={{ marginBottom: 7 }} /><Skeleton height={60} style={{ marginBottom: 7 }} /><Skeleton height={60} /></>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ClipboardIcon size={44} color="var(--text-3)" />} title={activeFilters > 0 ? 'Sin resultados' : 'Sin ventas'} description={activeFilters > 0 ? 'Probá con otros filtros' : 'Todavía no registraste ventas'} />
        ) : (
          Object.entries(grouped).map(([day, vs]) => {
            const dayTotal = vs.reduce((s, v) => s + v.total, 0);
            return (
              <div key={day} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.6px' }}>{day}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-dark)' }}>{formatMoney(dayTotal)}</span>
                </div>
                {vs.map(v => <SaleCard key={v.id} venta={v} />)}
              </div>
            );
          })
        )}
      </div>
    </IonContent>
  );
};

export default HistorialPage;
