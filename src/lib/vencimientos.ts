// ═══════════════════════════════════════════════════════════════════════════
// Notificaciones de vencimiento. Lee los lotes próximos a vencer (de Stockly)
// y dispara una notificación local. No modifica Stockly: solo lee `lotes`.
// Se ejecuta al abrir la app (con un tope de 1 vez por día para no molestar).
// ═══════════════════════════════════════════════════════════════════════════
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from './supabase';
import { getLocalSetting, setLocalSetting } from './outbox';

const DIAS_AVISO = 7;          // avisar productos que vencen en 7 días o menos
const UNA_VEZ_POR_DIA = true;  // no repetir la notificación el mismo día

// Pide permiso de notificaciones (no-op en web; funciona en Android)
async function asegurarPermiso(): Promise<boolean> {
  try {
    const actual = await LocalNotifications.checkPermissions();
    if (actual.display === 'granted') return true;
    const pedido = await LocalNotifications.requestPermissions();
    return pedido.display === 'granted';
  } catch {
    return false; // en web/desktop puede no estar disponible
  }
}

interface LoteVenc { id: string; producto_id: string; fecha_vencimiento: string | null; cantidad: number; }

export async function chequearVencimientos(comercioId: string, sucursalId: string | null): Promise<void> {
  try {
    // Tope: una sola notificación por día
    if (UNA_VEZ_POR_DIA) {
      const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const ultimo = await getLocalSetting('ultimo-aviso-venc');
      if (ultimo === hoy) return;
    }

    const limite = new Date();
    limite.setDate(limite.getDate() + DIAS_AVISO);
    const limiteISO = limite.toISOString().slice(0, 10);

    let q = supabase
      .from('lotes')
      .select('id, producto_id, fecha_vencimiento, cantidad')
      .eq('comercio_id', comercioId)
      .eq('retirado', false)
      .gt('cantidad', 0)
      .not('fecha_vencimiento', 'is', null)
      .lte('fecha_vencimiento', limiteISO);
    if (sucursalId) q = q.eq('sucursal_id', sucursalId);

    const { data, error } = await q;
    if (error || !data || data.length === 0) return;

    const lotes = data as LoteVenc[];

    // Cuántos vencidos vs por vencer
    const hoyTs = Date.now();
    let vencidos = 0, porVencer = 0;
    for (const l of lotes) {
      const ts = new Date(l.fecha_vencimiento!).getTime();
      if (ts < hoyTs) vencidos++; else porVencer++;
    }

    const permiso = await asegurarPermiso();
    if (!permiso) return;

    // Construir mensaje
    const partes: string[] = [];
    if (porVencer > 0) partes.push(`${porVencer} por vencer`);
    if (vencidos > 0)  partes.push(`${vencidos} ya vencido${vencidos > 1 ? 's' : ''}`);
    const cuerpo = `Tenés ${partes.join(' y ')}. Priorizá venderlos antes de perderlos.`;

    await LocalNotifications.schedule({
      notifications: [{
        id: Date.now() % 100000,
        title: '📦 Productos por vencer',
        body: cuerpo,
        schedule: { at: new Date(Date.now() + 2000) }, // 2s después de abrir
      }],
    });

    if (UNA_VEZ_POR_DIA) {
      await setLocalSetting('ultimo-aviso-venc', new Date().toISOString().slice(0, 10));
    }
  } catch (e) {
    console.warn('[vencimientos] no se pudo chequear:', e);
  }
}
