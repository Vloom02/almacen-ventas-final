// ═══════════════════════════════════════════════════════════════════════════
// Pantalla de venta. Escanea / busca → carrito → confirma (FEFO + offline).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IonContent, IonModal, IonToast } from '@ionic/react';
import { useVentas, formatMoney } from '../context/VentasContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFontScale, ESCALA_MIN, ESCALA_MAX } from '../context/FontScaleContext';
import { useEmpleado } from '../context/EmpleadoContext';
import { useOwner } from '../context/OwnerContext';
import { Button, Card, SyncBanner, EmptyState } from '../components/ui';
import {
  ShoppingCartIcon, MagnifyingGlass, PlusIcon, MinusIcon, XMarkIcon,
  TrashIcon, CheckIcon, SunIcon, MoonIcon, LockClosedIcon,
} from '../components/ui/icons';
import { Producto } from '../types';
import { armarTicket } from '../lib/ticket';
import { Capacitor } from '@capacitor/core';

const payOptions = [
  { key: 'efectivo',     label: '💵 Efectivo' },
  { key: 'transferencia',label: '📱 Transfer.' },
  { key: 'tarjeta',      label: '💳 Tarjeta' },
  { key: 'qr',           label: '📲 QR' },
];

const VentaPage: React.FC = () => {
  const { state, escanear, buscarPorNombre, agregarProducto, setQty, quitar, vaciar, confirmarVenta } = useVentas();
  const { sucursalActiva, sucursales, setSucursalActiva, comercio } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const { escala, setEscala } = useFontScale();
  const { cajero, cerrarTurno } = useEmpleado();
  const { isUnlocked, lock } = useOwner();

  const [scan, setScan]           = useState('');
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Producto[]>([]);
  const [showConfirm, setConfirm] = useState(false);
  const [metodoPago, setMetodo]   = useState('efectivo');
  const [cliente, setCliente]     = useState('');
  const [descuento, setDescuento] = useState('');
  const [fiado, setFiado]         = useState(false);
  const [processing, setProc]     = useState(false);
  const [ticket, setTicket]       = useState<string | null>(null);
  const [toast, setToast]         = useState({ show: false, msg: '', color: 'success' });
  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => scanRef.current?.focus(), 200); }, []);

  const toast$ = (msg: string, ok = true) => setToast({ show: true, msg, color: ok ? 'success' : 'danger' });

  const handleScan = async (codigo: string) => {
    const r = await escanear(codigo);
    toast$(r.msg, r.ok);
    setScan('');
    scanRef.current?.focus();
  };

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    setResults(q.length >= 2 ? await buscarPorNombre(q) : []);
  }, [buscarPorNombre]);

  const pickProduct = async (p: Producto) => {
    const r = await agregarProducto(p);
    toast$(r.msg, r.ok);
    setQuery(''); setResults([]);
  };

  const subtotal = state.cart.reduce((s, c) => s + c.precio * c.qty, 0);
  const desc = Math.min(subtotal, parseFloat(descuento) || 0);
  const total = subtotal - desc;
  const totalItems = state.cart.reduce((s, c) => s + c.qty, 0);

  const fiadoSinCliente = fiado && !cliente.trim();

  const handleConfirm = async () => {
    if (fiadoSinCliente) {
      toast$('Ingresá el nombre del cliente para registrar el fiado', false);
      return;
    }
    // Snapshot del carrito ANTES de confirmar (confirmarVenta vacía el carrito).
    const snap = {
      items: state.cart.map(c => ({ nombre: c.nombre, qty: c.qty, precio: c.precio })),
      subtotal, descuento: desc, total, metodoPago, cliente: cliente.trim(), fiado,
    };
    setProc(true);
    const r = await confirmarVenta({ metodoPago, cliente: cliente.trim(), fiado, descuento: desc, usuario: cajero?.nombre ?? null });
    setProc(false);
    if (r.ok) {
      const txt = armarTicket({
        comercio: comercio?.nombre ?? 'Almacén',
        sucursal: sucursalActiva?.nombre,
        fecha: new Date(),
        folio: (r.ventaId ?? '').replace(/-/g, '').slice(0, 6).toUpperCase() || '------',
        items: snap.items, subtotal: snap.subtotal, descuento: snap.descuento,
        total: snap.total, metodoPago: snap.metodoPago, cliente: snap.cliente, fiado: snap.fiado,
      }, formatMoney);
      setTicket(txt);
      setConfirm(false); setCliente(''); setDescuento(''); setFiado(false); setMetodo('efectivo');
      toast$(r.msg, true);
    } else {
      toast$(r.msg, false);
    }
  };

  const compartirTicket = async () => {
    if (!ticket) return;
    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: 'Comprobante de venta', text: ticket, dialogTitle: 'Compartir comprobante' });
      } else if (navigator.share) {
        await navigator.share({ text: ticket });
      } else {
        await navigator.clipboard.writeText(ticket);
        toast$('Comprobante copiado', true);
      }
    } catch { /* el usuario canceló el share */ }
  };

  const copiarTicket = async () => {
    if (!ticket) return;
    try { await navigator.clipboard.writeText(ticket); toast$('Comprobante copiado', true); }
    catch { toast$('No se pudo copiar', false); }
  };

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <SyncBanner queueLen={state.outboxLen} isOnline={state.isOnline} />

      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 90, paddingTop: state.outboxLen > 0 || !state.isOnline ? 44 : 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{comercio?.nombre ?? 'Almacén'}</h1>
            {sucursales.length > 1 ? (
              <select value={sucursalActiva?.id ?? ''} onChange={e => { const s = sucursales.find(x => x.id === e.target.value); if (s) setSucursalActiva(s); }}
                style={{ marginTop: 4, fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '3px 10px', fontFamily: 'inherit' }}>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{sucursalActiva?.nombre}</div>
            )}
            {cajero && (
              <button type="button"
                onClick={() => { if (window.confirm(`¿Cerrar el turno de ${cajero.nombre}?`)) cerrarTurno(); }}
                className="pressable"
                style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                👤 {cajero.nombre} · salir
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {totalItems > 0 && (
              <div style={{ position: 'relative' }}>
                <ShoppingCartIcon size={26} color="var(--color-primary)" />
                <span style={{ position: 'absolute', top: -6, right: -8, background: 'var(--color-danger)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 'var(--radius-full)', padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>{totalItems}</span>
              </div>
            )}
            {/* Tamaño de texto */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', background: 'var(--surface-2)', overflow: 'hidden', flexShrink: 0 }}>
              <button onClick={() => setEscala(escala - 0.05)} disabled={escala <= ESCALA_MIN}
                aria-label="Achicar texto" className="pressable"
                style={{ width: 34, height: 38, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, opacity: escala <= ESCALA_MIN ? .4 : 1 }}>A−</button>
              <button onClick={() => setEscala(escala + 0.05)} disabled={escala >= ESCALA_MAX}
                aria-label="Agrandar texto" className="pressable"
                style={{ width: 34, height: 38, border: 'none', borderLeft: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 18, fontWeight: 700, opacity: escala >= ESCALA_MAX ? .4 : 1 }}>A+</button>
            </div>
            <button onClick={toggleDark} aria-label="Cambiar tema" className="pressable"
              style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {isDark ? <SunIcon size={20} color="var(--color-warning)" /> : <MoonIcon size={20} color="var(--text-2)" />}
            </button>
            {isUnlocked && (
              <button onClick={lock} aria-label="Salir de modo dueño" className="pressable"
                style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', border: '1px solid var(--color-primary-border)', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <LockClosedIcon size={18} color="var(--color-primary-dark)" />
              </button>
            )}
          </div>
        </div>

        {/* Scanner */}
        <Card variant="bordered" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, animation: 'pulse 2s infinite' }} />
          <input ref={scanRef} value={scan} onChange={e => setScan(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && scan.trim()) handleScan(scan.trim()); }}
            placeholder="Escaneá un producto..." autoComplete="off" spellCheck={false}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', fontFamily: 'var(--font-mono)', color: 'var(--text)' }} />
        </Card>

        {/* Manual search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <MagnifyingGlass size={18} color="var(--text-3)" />
            </span>
            <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Buscar por nombre..."
              style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 15, background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none' }} />
          </div>
          {results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', overflow: 'hidden', marginTop: 4 }}>
              {results.map(p => (
                <button key={p.id} onClick={() => pickProduct(p)} className="pressable"
                  style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.codigo_barras}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>{formatMoney(p.precio)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        {state.cart.length === 0 ? (
          <EmptyState icon={<ShoppingCartIcon size={44} color="var(--text-3)" />} title="El carrito está vacío" description="Escaneá o buscá productos para comenzar la venta" />
        ) : (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>🧾 Carrito</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
              </div>
              {state.cart.map((item, i) => (
                <div key={item.productoId} style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < state.cart.length - 1 ? '1px solid var(--border)' : 'none', background: item.qty > item.stockDisponible ? 'var(--color-danger-bg)' : undefined }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                      {formatMoney(item.precio)} c/u ·{' '}
                      <span style={{ color: item.stockDisponible <= 0 ? 'var(--color-danger)' : item.stockDisponible <= 5 ? 'var(--color-warning-dark)' : 'var(--text-2)', fontWeight: item.stockDisponible <= 5 ? 600 : 400 }}>
                        {item.stockDisponible <= 0 ? 'sin stock' : `${item.stockDisponible} en stock`}
                      </span>
                      {item.qty > item.stockDisponible && item.stockDisponible >= 0 && (
                        <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}> · ⚠️ vendés {item.qty - item.stockDisponible} de más</span>
                      )}
                    </div>
                  </div>
                  <button aria-label={`Restar uno a ${item.nombre}`} onClick={() => setQty(item.productoId, item.qty - 1)} className="pressable" style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-warning)' }}><MinusIcon size={16} /></button>
                  <input type="number" inputMode="numeric" value={item.qty} aria-label={`Cantidad de ${item.nombre}`}
                    onChange={e => { const v = parseInt(e.target.value); setQty(item.productoId, isNaN(v) ? 0 : v); }}
                    onFocus={e => e.target.select()}
                    style={{ width: 44, fontSize: 15, fontWeight: 700, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 2px', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  <button aria-label={`Sumar uno a ${item.nombre}`} onClick={() => setQty(item.productoId, item.qty + 1)} className="pressable" style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}><PlusIcon size={16} /></button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--color-accent)', minWidth: 64, textAlign: 'right' }}>{formatMoney(item.precio * item.qty)}</span>
                  <button aria-label={`Quitar ${item.nombre} del carrito`} onClick={() => quitar(item.productoId)} className="pressable" style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }}><XMarkIcon size={16} /></button>
                </div>
              ))}
            </div>

            {/* Total bar */}
            <div style={{ background: 'linear-gradient(135deg, var(--amber-400), var(--amber-600))', color: '#2a1a00', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-md), var(--glow)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, opacity: .85, letterSpacing: '.12em' }}>TOTAL</div>
                <div style={{ fontSize: 12, opacity: .6, fontFamily: 'var(--font-mono)' }}>{totalItems} item{totalItems !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{formatMoney(subtotal)}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={() => { if (confirm('¿Vaciar carrito?')) vaciar(); }} style={{ flex: .4 }}><TrashIcon size={18} /></Button>
              <Button onClick={() => setConfirm(true)} style={{ flex: 1 }}><CheckIcon size={18} /> Confirmar venta</Button>
            </div>
          </>
        )}
      </div>

      {/* Confirm modal */}
      <IonModal isOpen={showConfirm} onDidDismiss={() => setConfirm(false)} breakpoints={[0, 1]} initialBreakpoint={1}>
        <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
          <div style={{ padding: 'var(--space-5)', maxWidth: 520, margin: '0 auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Confirmar venta</h2>

            {/* Receipt */}
            <Card variant="flat" style={{ marginBottom: 16, borderStyle: 'dashed', border: '2px dashed var(--border)' }}>
              {state.cart.map(c => (
                <div key={c.productoId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0' }}>
                  <span>{c.nombre} <span style={{ color: 'var(--text-3)' }}>x{c.qty}</span></span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(c.precio * c.qty)}</span>
                </div>
              ))}
              {desc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0', color: 'var(--color-primary-dark)' }}><span>Descuento</span><span style={{ fontFamily: 'var(--font-mono)' }}>-{formatMoney(desc)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 17, paddingTop: 8, marginTop: 6, borderTop: '1px dashed var(--border)' }}>
                <span>TOTAL</span><span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(total)}</span>
              </div>
            </Card>

            {/* Descuento */}
            <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Descuento ($)</label>
            <input type="number" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0"
              style={{ width: '100%', padding: 11, fontSize: 15, background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', outline: 'none', marginBottom: 12, textAlign: 'center' }} />

            {/* Cliente */}
            <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Cliente (opcional)</label>
            <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente"
              aria-label="Nombre del cliente"
              style={{ width: '100%', padding: 11, fontSize: 15, background: 'var(--surface)', color: 'var(--text)', border: `1.5px solid ${fiadoSinCliente ? 'var(--color-danger)' : 'var(--border)'}`, borderRadius: 'var(--radius)', outline: 'none', marginBottom: 12 }} />

            {/* Método de pago */}
            <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Método de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
              {payOptions.map(o => (
                <button key={o.key} onClick={() => setMetodo(o.key)}
                  style={{ padding: 10, border: metodoPago === o.key ? '1.5px solid var(--color-primary)' : '1.5px solid var(--border)', borderRadius: 'var(--radius)', background: metodoPago === o.key ? 'var(--color-primary-bg)' : 'var(--surface)', color: metodoPago === o.key ? 'var(--color-primary-dark)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                  {o.label}
                </button>
              ))}
            </div>

            {/* Fiado */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: fiadoSinCliente ? 6 : 16 }}>
              <input type="checkbox" checked={fiado} onChange={e => setFiado(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 14 }}>Registrar como deuda (fiado)</span>
            </label>
            {fiadoSinCliente && (
              <div style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 16 }}>
                Ingresá el nombre del cliente para registrar la deuda.
              </div>
            )}

            <Button fullWidth size="lg" onClick={handleConfirm} loading={processing} disabled={fiadoSinCliente}><CheckIcon size={18} /> Confirmar y descontar stock</Button>
            <Button fullWidth variant="ghost" onClick={() => setConfirm(false)} style={{ marginTop: 8 }}>Volver</Button>
          </div>
        </IonContent>
      </IonModal>

      {/* Ticket / comprobante tras la venta */}
      <IonModal isOpen={!!ticket} onDidDismiss={() => setTicket(null)} breakpoints={[0, 1]} initialBreakpoint={1}>
        <IonContent>
          <div style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckIcon size={22} color="var(--color-primary)" />
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Venta registrada</h2>
            </div>
            <pre style={{
              fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre',
              background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              padding: 'var(--space-4)', overflowX: 'auto', color: 'var(--text)', margin: 0, marginBottom: 16,
            }}>{ticket}</pre>
            <Button fullWidth size="lg" onClick={compartirTicket}>Compartir comprobante</Button>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button variant="secondary" onClick={copiarTicket} style={{ flex: 1 }}>Copiar</Button>
              <Button variant="ghost" onClick={() => setTicket(null)} style={{ flex: 1 }}>Listo</Button>
            </div>
          </div>
        </IonContent>
      </IonModal>

      <IonToast isOpen={toast.show} onDidDismiss={() => setToast(t => ({ ...t, show: false }))} message={toast.msg} duration={2500} position="top" color={toast.color} />
    </IonContent>
  );
};

export default VentaPage;
