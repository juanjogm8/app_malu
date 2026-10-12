/* Flujos de humo de la SPEC §16, contra el Supabase simulado. */
import { expect, test } from '@playwright/test'
import { addDays, fShort, today } from '../../src/lib/fechas'
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

test('4 · planear una comida con ingredientes y pasarlos al súper sin duplicar', async ({
  page,
}) => {
  const sb = new SupabaseFalso(dbVacia())
  sb.db.shopping_items!.push({
    id: 'ya',
    created_by: null,
    created_at: '',
    updated_at: '',
    text: 'Cebolla',
    category: 'frutas',
    done: false,
  })
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/mas/comidas')
  await page
    .getByRole('button', { name: /Comida Sin planear/ })
    .first()
    .click()
  await page.getByLabel('Qué se come').fill('Sopa de lentejas')
  await page.getByLabel(/Ingredientes/).fill('Lentejas, jitomate, cebolla')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('3 ingredientes')).toBeVisible()
  await expect(page.getByText('1 de 21 comidas planeadas')).toBeVisible()

  await page.getByRole('button', { name: 'Pasar ingredientes al súper (3)' }).click()
  await expect(page.getByText('Agregué 2 ingredientes al súper.')).toBeVisible()
  expect(sb.db.shopping_items!.map((i) => i.text).sort()).toEqual([
    'Cebolla',
    'Lentejas',
    'jitomate',
  ])
  expect(sb.db.shopping_items!.find((i) => i.text === 'Lentejas')!.category).toBe('despensa')

  // Al vaciar platillo e ingredientes se borra la fila
  await page.getByRole('button', { name: /Sopa de lentejas/ }).click()
  await page.getByLabel('Qué se come').fill('')
  await page.getByLabel(/Ingredientes/).fill('')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect.poll(() => sb.db.meals!.length).toBe(0)
})

test('revisión de la semana: +1 semana y cierre', async ({ page }) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/mas')
  await page.getByRole('link', { name: /Revisión de la semana/ }).click()
  await expect(page.getByRole('heading', { name: 'Lo que se atoró' })).toBeVisible()
  const foco = sb.db.tasks!.find((t) => t.text === 'Cambiar foco del pasillo')!
  await page.getByRole('button', { name: '+1 semana' }).first().click()
  await expect.poll(() => foco.due_date).toBe(addDays(today(), 7))
  await page.getByRole('button', { name: 'Listo, hasta la próxima semana' }).click()
  await expect(page.getByRole('heading', { name: 'Semana en orden' })).toBeVisible()
  await expect(page.getByText(/Resolvieron 1 pendiente atorado/)).toBeVisible()
  await page.getByRole('button', { name: 'Volver a Inicio' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('planes: sorpréndeme y notas: búsqueda sin acentos', async ({ page }) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/mas/planes')
  await page.getByRole('button', { name: 'Sorpréndeme con una idea' }).click()
  await expect(page.getByRole('button', { name: 'Planearlo' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir enlace' })).toHaveAttribute('target', '_blank')

  await page.goto('/mas/notas')
  await page.getByLabel('Buscar notas').fill('modem')
  await expect(page.getByText('Clave del wifi')).toBeVisible()
  await expect(page.getByText('Medidas de la sala')).toBeHidden()
  await page.getByRole('button', { name: 'Contactos' }).click()
  await page.getByLabel('Buscar por nombre u oficio').fill('ramirez')
  await expect(page.getByText('55 8765 4321')).toBeVisible()
})

test('sin conexión: muestra lo guardado y bloquea la escritura con aviso', async ({
  page,
  context,
}) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/listas/super')
  await expect(page.getByRole('checkbox', { name: 'Aguacate' })).toBeVisible()
  await page.waitForTimeout(1500) // deja que la caché se guarde en IndexedDB

  // Al volver a abrir sin red, los datos salen de la caché del dispositivo.
  sb.caido = true
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Aguacate' })).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Aguacate' }).click()
  await expect(page.getByText(/no se guardó/)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Aguacate' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await context.setOffline(false)
})

test('cerrar sesión borra la caché del dispositivo', async ({ page }) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hola, Juanjo' })).toBeVisible()
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Cuenta' }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
  const guardado = await page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('keyval-store')
        r.onsuccess = () => {
          const tx = r.result.transaction('keyval', 'readonly')
          const g = tx.objectStore('keyval').get('casa-en-orden:cache')
          g.onsuccess = () => res(g.result ?? null)
        }
        r.onerror = () => res(null)
      }),
  )
  expect(guardado).toBeNull()
})
