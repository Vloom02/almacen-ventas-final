// ═══════════════════════════════════════════════════════════════════════════
// Gestión de cajeros (solo dueño, vía Caja → Seguridad). Alta con legajo +
// nombre + contraseña; activar/desactivar; cambiar contraseña.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { IonContent, IonToast } from '@ionic/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useEmpleado } from '../context/EmpleadoContext';
import { Card, Button, Input } from '../components/ui';
import { PlusIcon } from '../components/ui/icons';

const CajerosPage: React.FC = () => {
  const { comercio } = useAuth();
  const { empleados, recargar } = useEmpleado();
  const [legajo, setLegajo] = useState('');
  const [nombre, setNombre] = useState('');
  const [pass, setPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', color: 'success' as 'success' | 'danger' });

  const aviso = (msg: string, ok = true) => setToast({ show: true, msg, color: ok ? 'success' : 'danger' });

  const agregar = async () => {
    if (!comercio || !legajo.trim() || !nombre.trim() || !pass) { aviso('Completá legajo, nombre y contraseña', false); return; }
    setSaving(true);
    const { error } = await supabase.rpc('guardar_empleado_venta', {
      p: { comercio_id: comercio.id, legajo: legajo.trim(), nombre: nombre.trim(), pass },
    });
    setSaving(false);
    if (error) { aviso('No se pudo guardar: ' + error.message, false); return; }
    setLegajo(''); setNombre(''); setPass('');
    await recargar();
    aviso('Cajero agregado');
  };

  const toggleActivo = async (e: { id: string; legajo: string; nombre: string; activo?: boolean }) => {
    if (!comercio) return;
    if (e.activo !== false) {
      const { error } = await supabase.rpc('baja_empleado_venta', { p: { id: e.id, comercio_id: comercio.id } });
      if (error) { aviso('No se pudo desactivar', false); return; }
    } else {
      const { error } = await supabase.rpc('guardar_empleado_venta', {
        p: { id: e.id, comercio_id: comercio.id, legajo: e.legajo, nombre: e.nombre, activo: true },
      });
      if (error) { aviso('No se pudo reactivar', false); return; }
    }
    await recargar();
  };

  const cambiarPass = async (e: { id: string; legajo: string; nombre: string }) => {
    if (!comercio) return;
    const nueva = window.prompt(`Nueva contraseña para ${e.nombre}:`);
    if (!nueva) return;
    const { error } = await supabase.rpc('guardar_empleado_venta', {
      p: { id: e.id, comercio_id: comercio.id, legajo: e.legajo, nombre: e.nombre, pass: nueva },
    });
    aviso(error ? 'No se pudo cambiar' : 'Contraseña actualizada', !error);
  };

  return (
    <IonContent style={{ '--background': 'var(--bg)' } as React.CSSProperties}>
      <div style={{ padding: 'var(--space-4)', maxWidth: 520, margin: '0 auto', paddingBottom: 'calc(90px + var(--sab,env(safe-area-inset-bottom)))' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>👥 Cajeros</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.5 }}>
          Cada cajero inicia su turno con su legajo y contraseña; sus ventas quedan a su nombre. Es propio de Ventas (no son las cuentas de Stockly).
        </p>

        {/* Alta */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-2)' }}>Agregar cajero</div>
          <Input label="Legajo" value={legajo} onChange={setLegajo} placeholder="Ej: 01" />
          <Input label="Nombre" value={nombre} onChange={setNombre} placeholder="Ej: Juan Pérez" />
          <Input label="Contraseña" value={pass} onChange={setPass} type="password" placeholder="Mínimo 4 caracteres" />
          <Button fullWidth onClick={agregar} loading={saving} disabled={!legajo.trim() || !nombre.trim() || pass.length < 4} style={{ marginTop: 8 }}>
            <PlusIcon size={17} /> Agregar
          </Button>
        </Card>

        {/* Lista */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text-2)' }}>Equipo de caja</div>
          {empleados.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 14 }}>Todavía no agregaste cajeros.</p>
          ) : empleados.map((e, i) => {
            const activo = e.activo !== false;
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < empleados.length - 1 ? '1px solid var(--border)' : 'none', opacity: activo ? 1 : 0.5 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🧑</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{e.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>legajo #{e.legajo}{activo ? '' : ' · inactivo'}</div>
                </div>
                <button type="button" onClick={() => cambiarPass(e)} className="pressable"
                  style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔑
                </button>
                <button type="button" onClick={() => toggleActivo(e)} className="pressable"
                  style={{ padding: '6px 10px', border: '1px solid ' + (activo ? 'var(--color-danger-border)' : 'var(--color-primary-border)'), borderRadius: 'var(--radius)', background: activo ? 'var(--color-danger-bg)' : 'var(--color-primary-bg)', color: activo ? 'var(--color-danger)' : 'var(--color-primary-dark)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {activo ? 'Baja' : 'Alta'}
                </button>
              </div>
            );
          })}
        </Card>
      </div>
      <IonToast isOpen={toast.show} onDidDismiss={() => setToast(t => ({ ...t, show: false }))} message={toast.msg} duration={2400} position="top" color={toast.color} />
    </IonContent>
  );
};

export default CajerosPage;
