# 🚀 Almacén Ventas — Cómo correr y compilar

App de punto de venta vinculada a la base de Stockly (Supabase compartido).

## ✅ Ya está configurado
- `.env` con las credenciales de Supabase (compartidas con Stockly)
- Tablas `ventas_*` ya creadas en Supabase
- Íconos de Android generados desde tu logo

## 1. Instalar dependencias
```bash
npm install
```

## 2. Probar en el navegador (desarrollo)
```bash
npm run dev
```
Abrí http://localhost:5173 — iniciá sesión con tu cuenta de Stockly.

## 3. Compilar el APK de Android

### Requisitos
- Android Studio instalado
- Node 18+

### Pasos
```bash
# 1. Build de la web
npm run build

# 2. Agregar plataforma Android (solo la primera vez)
npx cap add android

# 3. Copiar el build a Android
npx cap sync android

# 4. Generar los íconos en todas las densidades (opcional, ya están incluidos)
npx @capacitor/assets generate --android

# 5. Abrir en Android Studio
npx cap open android
```

En Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s).
El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## 🔑 Login
Usás la MISMA cuenta de Stockly. No hay registro separado.
El catálogo de productos lo gestiona Stockly; esta app solo vende y descuenta stock (FEFO).

## ⚠️ Seguridad
Rotá la anon key en Supabase → Settings → API cuando termines de probar,
ya que se compartió en texto. El RLS protege los datos igual.
