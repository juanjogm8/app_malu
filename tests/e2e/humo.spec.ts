import { expect, test } from '@playwright/test'

test('sin sesión, cualquier vista lleva al inicio de sesión', async ({ page }) => {
  await page.goto('/pendientes')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Casa en Orden' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar con Google' })).toBeVisible()
})

test('un rechazo del alta muestra "no autorizada"', async ({ page }) => {
  await page.goto('/login?error=server_error&error_description=Database+error+saving+new+user')
  await expect(page).toHaveURL(/\/sin-acceso$/)
  await expect(page.getByRole('heading', { name: 'Esta cuenta no está autorizada' })).toBeVisible()
})
