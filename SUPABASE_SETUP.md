# Setup — App de Ventas vinculada a Stockly

## ⚠️ Concepto: misma base, dos apps
La app de ventas comparte el proyecto Supabase de Stockly. NO se crea proyecto nuevo.

## 1. Copiar credenciales de Stockly
Usá el mismo `.env` de Stockly:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 2. Correr SOLO el SQL de ventas
Dashboard → SQL Editor → pegar `src/lib/ventas.sql` → Run

Esto crea `ventas_ventas`, `ventas_items`, `ventas_deudas`.
NO recrea comercios/productos/lotes/movimientos (ya existen en Stockly).
Usa la función `comercios_del_usuario()` que ya creó Stockly.

## 3. Login
La misma cuenta de Stockly entra a la app de ventas. No hay doble registro.

## Cómo funciona el stock (FEFO)
- El catálogo (`productos`) lo gestiona Stockly. Ventas solo lee.
- El stock real vive en `lotes` (cada lote tiene vencimiento).
- Al vender, se descuenta del lote que vence ANTES (First Expired First Out).
- Si un lote llega a 0 → `retirado = true`.
- Cada descuento escribe en `movimientos` con `tipo='retiro_venta'`.
- Stockly lee esos movimientos y recalcula vencimientos automáticamente.

## Offline-first
- La venta se guarda local (IndexedDB) y se encola en el outbox.
- Al volver internet, se sincroniza recalculando FEFO contra el stock MÁS reciente
  de la nube (aplica delta, no pisa cantidad vieja).
- Los movimientos y ventas son inserts inmutables → sin conflictos.
