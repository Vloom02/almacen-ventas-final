import { test, expect } from '@playwright/test';

// Smoke: la app debe bootear y mostrar el login (no quedar en blanco).
// Este test habría atrapado el bug de "pantalla en blanco" del build de prod.
test('arranca y muestra el login', async ({ page }) => {
  const errores: string[] = [];
  page.on('pageerror', e => errores.push(e.message));

  await page.goto('/');

  // El encabezado del login tiene que aparecer.
  await expect(page.getByRole('heading', { name: 'Almacén Ventas' })).toBeVisible({ timeout: 15_000 });

  // No debe haber errores fatales de JS en el arranque.
  expect(errores, errores.join('\n')).toHaveLength(0);
});

test('muestra los campos de ingreso', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible({ timeout: 15_000 });
});
