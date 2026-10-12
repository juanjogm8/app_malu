/* Flujos de humo de la SPEC §16, contra el Supabase simulado. */
import { expect, test } from '@playwright/test'
import { fShort, today } from '../../src/lib/fechas'
import { nextAfter } from '../../src/lib/recurrencia'
import { SupabaseFalso, dbVacia, iniciarSesion } from './supabase-falso'

test('1 · agregar al súper, marcarlo y que persista al recargar', async ({ page }) => {
  const sb = new SupabaseFalso(dbVacia())
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/listas/super')
  await expect(page.getByRole('heading', { name: 'La lista está vacía' })).toBeVisible()

  await page.getByLabel('Agregar al súper…').fill('Leche 2 L')
  await page.getByLabel('Agregar al súper…').press('Enter')
  await expect(page.getByRole('heading', { name: 'Lácteos y huevo' })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Leche 2 L' }).click()
  await expect(page.getByText('1 de 1 en el carrito').first()).toBeVisible()

  // Duplicado comprado: vuelve a la lista
  await page.getByLabel('Agregar al súper…').fill('leche 2 l')
  await page.getByLabel('Agregar al súper…').press('Enter')
  await expect(page.getByText('Volvió a la lista.')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Leche 2 L' }).click()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Leche 2 L' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(sb.db.shopping_items).toHaveLength(1)
})

test('2 · crear un evento y verlo en mes y semana', async ({ page }) => {
  const sb = new SupabaseFalso(dbVacia())
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Mes' }).click()
  await page.getByRole('button', { name: '+ Evento' }).click()
  await page.getByLabel('Título').fill('Cena con amigos')
  await page.getByLabel('Hora').fill('20:00')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: /Cena con amigos/ })).toBeVisible()
  await expect(page.getByText('Evento · Ambos')).toBeVisible()

  await page.getByRole('button', { name: 'Semana' }).click()
  await expect(page.getByRole('button', { name: /Cena con amigos/ })).toBeVisible()
  expect(sb.db.events![0]).toMatchObject({
    title: 'Cena con amigos',
    date: today(),
    is_shared: true,
  })
})

test('3 · completar una rutina, ver la nueva fecha y deshacer', async ({ page }) => {
  const sb = new SupabaseFalso(dbVacia())
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/pendientes')
  await page.getByRole('button', { name: 'Pagar la luz', exact: true }).click()
  // La hoja llega ya rellena con la repetición bimestral
  await expect(page.getByLabel('Se repite')).toHaveValue('bimestral')
  await page.getByLabel('Fecha límite').fill(today())
  await page.getByRole('button', { name: 'Guardar' }).click()

  await page.getByRole('checkbox', { name: /Pagar la luz/ }).click()
  const proxima = nextAfter(today(), 'bimestral', today())
  await expect(page.getByText(`Listo. Próxima: ${fShort(proxima)}.`)).toBeVisible()
  await expect(page.getByText(fShort(proxima), { exact: true })).toBeVisible()
  expect(sb.db.tasks![0]!.due_date).toBe(proxima)

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Hoy', { exact: true }).first()).toBeVisible()
  await expect.poll(() => sb.db.tasks![0]!.due_date).toBe(today())
})

test('5 · dos sesiones: lo que agrega una aparece en la otra sin recargar', async ({ browser }) => {
  const sb = new SupabaseFalso(dbVacia())
  const ctx = await browser.newContext()
  await sb.instalar(ctx)
  const a = await ctx.newPage()
  const b = await ctx.newPage()
  await iniciarSesion(a)
  await iniciarSesion(b)
  await a.goto('/listas/super')
  await b.goto('/listas/super')
  await expect(b.getByText('En vivo')).toBeVisible()

  await a.getByLabel('Agregar al súper…').fill('Tortillas')
  await a.getByLabel('Agregar al súper…').press('Enter')
  await expect(b.getByRole('checkbox', { name: 'Tortillas' })).toBeVisible()
  await expect(b.getByRole('heading', { name: 'Pan y tortillas' })).toBeVisible()
  await ctx.close()
})

test('eliminar desde la hoja con Deshacer vuelve a insertar el mismo registro', async ({
  page,
}) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/casa')
  const id = sb.db.home_improvements!.find((m) => m.text === 'Pintar la sala')!.id
  await page.getByRole('button', { name: /Pintar la sala/ }).click()
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Eliminado')).toBeVisible()
  await expect(page.getByRole('button', { name: /Pintar la sala/ })).toBeHidden()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('button', { name: /Pintar la sala/ })).toBeVisible()
  expect(sb.db.home_improvements!.some((m) => m.id === id)).toBe(true)
})

test('la hoja valida campos obligatorios', async ({ page }) => {
  const sb = new SupabaseFalso(dbVacia())
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/calendario')
  await page.getByRole('button', { name: '+ Evento' }).click()
  await page.getByLabel('Fecha', { exact: true }).fill('')
  await page.getByLabel('Título').fill('Algo')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Falta: fecha.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('si falla el guardado, avisa y se puede reintentar', async ({ page }) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/listas/compras')
  sb.fallar = true
  await page.getByRole('checkbox', { name: 'Licuadora' }).click()
  await expect(page.getByText('No se pudo guardar')).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Licuadora' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  sb.fallar = false
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('checkbox', { name: 'Licuadora' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('Inicio: primer uso y luego Hoy, Atrasados y Fechas', async ({ page }) => {
  const sb = new SupabaseFalso(dbVacia())
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hola, Juanjo' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Empiecen por aquí' })).toBeVisible()

  const sb2 = new SupabaseFalso()
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await sb2.instalar(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Atrasados' })).toBeVisible()
  await expect(page.getByText('Cumpleaños de Mamá').first()).toBeVisible()
  // "Hecho" en un atrasado lo reprograma o lo marca
  await page.getByRole('button', { name: 'Hecho' }).last().click()
  await expect(page.getByRole('heading', { name: 'Atrasados' })).toBeHidden()
})
