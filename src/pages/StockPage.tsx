// ═══════════════════════════════════════════════════════════════════════════
// Stock por lotes con vencimientos (lectura). Refleja el stock real de Stockly
// en la sucursal activa, ordenado por vencimiento (FEFO).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState, useMemo } from 'react';
import { IonContent } from '@ionic/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../context/VentasContext';
import { Card, Badge, EmptyState, Skeleton } from '../components/ui';
import { CubeIcon, ExclamationIcon, MagnifyingGlass } from '../components/ui/icons';
import { Producto, Lote } from '../types';

const StockPage: React.FC = () => {
  const { comercio, sucursalActiva } = useAuth();
  const [productos, setProds] = useState<Producto[]>([]);
  const [lotes, setLotes]     = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    (async () => {
      if (!comercio || !sucursalActiva) { setLoading(false); return; }
      setLoading(true);
      const [{ data: p }, { data: l }] = await Promise.all([
        supabase.from('productos').select('*').eq('comercio_id', comercio.id).eq('activo', true),
        supabase.from('lotes').select('*').eq('comercio_id', comercio.id).eq('sucursal_id', sucursalActiva.id).eq('retirado', false).gt('cantidad', 0),
      ]);
      setProds((p ?? []) as Producto[]);
      setLotes((l ?? []) as Lote[]);
      setLoading(false);
    })();
  }, [comercio, sucursalActiva]);

  const diasParaVencer = (fecha: string | null): number | null =>
    fecha === null ? null : Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);

  const rows = useMemo(() => productos
    .map(p => {
      const ls = lotes.filter(l => l.producto_id === p.id)
        .sort((a, b) => (a.fecha_vencimiento ?? '9999').localeCompare(b.fecha_vencimiento ?? '9999'));
      const stock = ls.reduce((s, l) => s + l.cantidad, 0);
      const proximoVenc = ls[0]?.fecha_vencimiento ?? null;
      return { producto: p, lotes: ls, stock, dias: diasParaVencer(proximoVenc) };
    })
    .filter(r => r.stock > 0)
    .filter(r => !search || r.producto.nombre.toLowerCase().includes(search.toLowerCase()) || r.producto.codigo_barras.includes(search))
    .sort((a, b) => (a.dias ?? 99999) - (b.dias ?? 99999)),
    [productos, lotes, search]);

  const porVencer = rows.filter(r => r.dias !== null && r.dias <= 7).length;

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 90 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Precios y stock</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
          {sucursalActiva?.nombre ?? 'Sucursal'} · gestionado por Stockly
        </p>

        {porVencer > 0 && (
          <Card style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationIcon size={20} color="var(--color-warning-dark)" />
            <span style={{ fontSize: 13, color: 'var(--color-warning-dark)', fontWeight: 500 }}>{porVencer} producto{porVencer > 1 ? 's' : ''} vence{porVencer > 1 ? 'n' : ''} en 7 días o menos</span>
          </Card>
        )}

        <div style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><MagnifyingGlass size={18} color="var(--text-3)" /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
            style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 15, background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }} />
        </div>

        {loading ? (
          <><Skeleton height={70} style={{ marginBottom: 7 }} /><Skeleton height={70} style={{ marginBottom: 7 }} /><Skeleton height={70} /></>
        ) : rows.length === 0 ? (
          <EmptyState icon={<CubeIcon size={44} color="var(--text-3)" />} title="Sin stock" description="No hay productos con stock en esta sucursal. Cargá lotes desde Stockly." />
        ) : (
          rows.map(r => {
            const c: 'red'|'yellow'|'green'|'gray' = r.dias === null ? 'gray' : r.dias < 0 ? 'red' : r.dias <= 7 ? 'red' : r.dias <= 30 ? 'yellow' : 'green';
            const label = r.dias === null ? 'Sin vto.' : r.dias < 0 ? 'Vencido' : r.dias === 0 ? 'Vence hoy' : `${r.dias}d`;
            return (
              <Card key={r.producto.id} variant="bordered" style={{ padding: '11px 12px', marginBottom: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.producto.nombre}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{r.producto.codigo_barras || 'sin código'}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600, marginTop: 2 }}>{formatMoney(r.producto.precio)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-primary-dark)' }}>{r.stock}</div>
                    <Badge color={c} style={{ marginTop: 2 }}>{label}</Badge>
                  </div>
                </div>
                {r.lotes.length > 1 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{r.lotes.length} lotes:</div>
                    {r.lotes.map(l => {
                      const d = diasParaVencer(l.fecha_vencimiento);
                      return (
                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)', padding: '1px 0' }}>
                          <span>{l.cantidad} u. {l.numero_lote ? `· ${l.numero_lote}` : ''}</span>
                          <span style={{ color: d !== null && d <= 7 ? 'var(--color-danger)' : 'var(--text-3)' }}>{l.fecha_vencimiento ? new Date(l.fecha_vencimiento).toLocaleDateString('es-AR') : 'sin vto.'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </IonContent>
  );
};

export default StockPage;
