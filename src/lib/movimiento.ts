// Opción "Animaciones: Sí / No" de la app (además de "Quitar animaciones" de Android).
const KEY = 'ventas:movimiento';
export const movimientoActivo = () => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } };
export function aplicarMovimiento(on: boolean) {
  if (on) delete document.documentElement.dataset.movimiento;
  else document.documentElement.dataset.movimiento = 'no';
}
export function guardarMovimiento(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* */ }
  aplicarMovimiento(on);
}
