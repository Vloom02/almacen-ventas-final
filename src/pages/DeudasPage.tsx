// ═══════════════════════════════════════════════════════════════════════════
// Deudas / Fiado — lee y actualiza ventas_deudas.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useState, useMemo } from 'react';
import { IonContent, IonToast } from '@ionic/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../context/VentasContext';
import { Card, Badge, EmptyState, Skeleton } from '../components/ui';
import { BookOpenIcon, CheckIcon, MagnifyingGlass } from '../components/ui/icons';

interface DeudaRow { id: string; cliente: string; monto: number; pagada: boolean; fecha: string; }

const DeudasPage: React.FC = () => {
  const { comercio } = useAuth();
  const [deudas, setDeudas] = useState<DeudaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '' });

  const load = async () => {
    if (!comercio) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('ventas_deudas').select('*')
      .eq('comercio_id', comercio.id).eq('pagada', false)
      .order('fecha', { ascending: false });
    setDeudas((data ?? []) as DeudaRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [comercio]);

  const marcarPagada = async (id: string, cliente: string) => {
    if (!confirm(`¿Marcar la deuda de "${cliente}" como pagada?`)) return;
    await supabase.from('ventas_deudas').update({ pagada: true }).eq('id', id);
    setDeudas(d => d.filter(x => x.id !== id));
    setToast({ show: true, msg: `${cliente} pagó su deuda` });
  };

  const filtered = useMemo(() => deudas.filter(d => !search || d.cliente.toLowerCase().includes(search.toLowerCase())), [deudas, search]);
  const total = useMemo(() => deudas.reduce((s, d) => s + d.monto, 0), [deudas]);

  // Agrupar por cliente
  const porCliente = useMemo(() => {
    const m: Record<string, { total: number; count: number }> = {};
    for (const d of filtered) { (m[d.cliente] ??= { total: 0, count: 0 }); m[d.cliente].total += d.monto; m[d.cliente].count++; }
    return m;
  }, [filtered]);

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 90 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📒 Deudas</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>Clientes con fiado pendiente</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
          <Card variant="bordered" style={{ padding: 10 }}><div style={{ fontSize: 11, color: 'var(--text-2)' }}>Deudas activas</div><div style={{ fontSize: 20, fontWeight: 700 }}>{deudas.length}</div></Card>
          <Card variant="bordered" style={{ padding: 10 }}><div style={{ fontSize: 11, color: 'var(--text-2)' }}>Total adeudado</div><div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', paddingTop: 2, color: 'var(--color-danger)' }}>{formatMoney(total)}</div></Card>
        </div>

        {deudas.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><MagnifyingGlass size={18} color="var(--text-3)" /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
              style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 15, background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }} />
          </div>
        )}

        {loading ? (
          <><Skeleton height={70} style={{ marginBottom: 7 }} /><Skeleton height={70} /></>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<BookOpenIcon size={44} color="var(--text-3)" />} title={deudas.length === 0 ? 'Sin deudas' : 'Sin resultados'} description={deudas.length === 0 ? 'No hay fiados pendientes' : 'Probá otra búsqueda'} />
        ) : (
          filtered.map(d => (
            <Card key={d.id} variant="bordered" style={{ padding: '12px 14px', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>👤 {d.cliente}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{new Date(d.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                  {porCliente[d.cliente]?.count > 1 && <Badge color="yellow" style={{ marginTop: 4 }}>Total cliente: {formatMoney(porCliente[d.cliente].total)}</Badge>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>{formatMoney(d.monto)}</span>
                  <button onClick={() => marcarPagada(d.id, d.cliente)} className="pressable" style={{ width: 36, height: 36, border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius)', background: 'var(--color-primary-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon size={18} color="var(--color-primary-dark)" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      <IonToast isOpen={toast.show} onDidDismiss={() => setToast({ show: false, msg: '' })} message={toast.msg} duration={2500} position="top" color="success" />
    </IonContent>
  );
};

export default DeudasPage;
