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

test('al volver de Google a la raíz con un rechazo, avisa y muestra el detalle', async ({
  page,
}) => {
  await page.goto('/?error=server_error&error_description=Database+error+saving+new+user')
  await expect(page).toHaveURL(/\/sin-acceso$/)
  await expect(page.getByRole('heading', { name: 'Esta cuenta no está autorizada' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('No se pudo dar de alta esta cuenta.')
  await expect(page.getByRole('alert')).toContainText('Database error saving new user')
})

test('el aviso de privacidad es público', async ({ page }) => {
  await page.goto('/privacidad')
  await expect(page.getByRole('heading', { name: 'Aviso de privacidad' })).toBeVisible()
  await expect(page.getByText(/uso limitado/)).toBeVisible()
})
