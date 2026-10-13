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
  await expect(page.getByText('3 ingredientes').filter({ visible: true })).toBeVisible()
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

test('sin conexión: muestra lo guardado, anota en cola y envía al volver la señal', async ({
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
  await expect(page.getByText(/se envía solo al volver la señal/)).toBeVisible()
  await page.getByRole('checkbox', { name: 'Aguacate' }).click()
  await page.getByLabel('Agregar al súper…').fill('Servilletas')
  await page.getByLabel('Agregar al súper…').press('Enter')
  await expect(page.getByRole('checkbox', { name: 'Aguacate' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByText('Por enviar')).toHaveCount(2)
  expect(sb.db.shopping_items!.find((i) => i.text === 'Aguacate')!.done).toBe(false)

  // Vuelve la señal: se envía la cola en orden.
  sb.caido = false
  await context.setOffline(false)
  await expect.poll(() => sb.db.shopping_items!.find((i) => i.text === 'Aguacate')!.done).toBe(true)
  await expect.poll(() => sb.db.shopping_items!.some((i) => i.text === 'Servilletas')).toBe(true)
  await expect(page.getByText('Por enviar')).toHaveCount(0)
})

test('sin conexión: gana la última escritura por registro', async ({ page, context }) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/listas/compras')
  await expect(page.getByRole('checkbox', { name: 'Licuadora' })).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('checkbox', { name: 'Licuadora' }).click()
  await page.getByRole('checkbox', { name: 'Tenis para correr' }).click()
  // Mientras tanto, la otra persona cambió la licuadora después (su cambio es más reciente).
  const lic = sb.db.purchases!.find((p) => p.text === 'Licuadora')!
  const tenis = sb.db.purchases!.find((p) => p.text === 'Tenis para correr')!
  lic.updated_at = new Date(Date.now() + 60_000).toISOString()
  await context.setOffline(false)
  // El cambio sin conflicto se aplica (prueba que la cola ya se envió)…
  await expect.poll(() => tenis.done).toBe(true)
  // …y el que tenía un cambio posterior en el servidor se descarta.
  expect(lic.done).toBe(false)
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

test('ajustes: conectar Telegram y el flag de resúmenes por persona', async ({ page }) => {
  const sb = new SupabaseFalso()
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/mas/ajustes')
  await expect(page.getByText('Sin conectar').first()).toBeVisible()
  await page.getByRole('button', { name: 'Conectar Telegram' }).click()
  await expect(page.getByText('/start AB12CD34')).toBeVisible()

  const flag = page.getByRole('switch', { name: /Cada quien elige sus resúmenes/ })
  await expect(flag).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByRole('switch', { name: 'Resumen diario' })).toBeHidden()
  await flag.click()
  await expect.poll(() => sb.db.app_settings![0]!.telegram_digest_per_person).toBe(true)
  await page.getByRole('switch', { name: /Resumen semanal/ }).click()
  await expect.poll(() => sb.db.members![0]!.digest_weekly).toBe(false)
})

test('google: la capa Google muestra los eventos y Ajustes manda a conectar', async ({ page }) => {
  const sb = new SupabaseFalso()
  sb.db.google_events!.push({
    id: 'g1',
    member_id: '00000000-0000-0000-0000-00000000000b',
    calendar_id: 'primary',
    google_event_id: 'x',
    etag: null,
    title: 'Junta de trabajo de Malu',
    date: today(),
    time: '12:00:00',
    html_link: 'https://calendar.google.com/x',
    updated_at: '',
  })
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/calendario')
  await expect(page.getByRole('button', { name: 'Google', exact: true })).toBeVisible()
  await expect(page.getByText('Junta de trabajo de Malu')).toBeVisible()
  await expect(page.getByText('Google · Malu')).toBeVisible()
  await page.getByRole('button', { name: 'Google', exact: true }).click()
  await expect(page.getByText('Junta de trabajo de Malu')).toBeHidden()

  await page.route('https://accounts.google.com/**', (r) =>
    r.fulfill({ body: '<h1>Google</h1>', contentType: 'text/html' }),
  )
  await page.goto('/mas/ajustes')
  await expect(page.getByText(/Google no ha verificado esta app/)).toBeVisible()
  await page.getByRole('button', { name: 'Conectar mi Google Calendar' }).click()
  await expect(page).toHaveURL(/accounts\.google\.com/)
})

test('niños: dar de alta un niño, agregar su evento desde Niños y elegirlo en eventos', async ({
  page,
}) => {
  const sb = new SupabaseFalso(dbVacia())
  await sb.instalar(page)
  await iniciarSesion(page)
  await page.goto('/mas/ninos')
  await page.getByRole('button', { name: '+ Niño' }).click()
  await page.getByLabel('Nombre').fill('Sofi')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(sb.db.kids).toMatchObject([{ name: 'Sofi' }])
  await expect(page.getByRole('button', { name: 'Sofi', pressed: true })).toBeVisible()

  // + Agregar abre "Nuevo evento" con el niño del filtro; el tipo solo aparece si hay niño.
  await page.getByRole('button', { name: '+ Agregar' }).click()
  const hoja = page.getByRole('dialog', { name: 'Nuevo evento' })
  await expect(hoja.getByLabel('Niño')).toHaveValue('Sofi')
  await hoja.getByLabel('Título').fill('Natación')
  await hoja.getByLabel('Tipo', { exact: true }).selectOption('actividad')
  await hoja.getByRole('button', { name: 'Guardar' }).click()
  await expect(hoja).toBeHidden()
  expect(sb.db.events![0]).toMatchObject({ title: 'Natación', kid: 'Sofi', kid_kind: 'actividad' })
  await expect(page.getByRole('heading', { name: 'Próximos' })).toBeVisible()
  await page.getByRole('button', { name: 'Escuela' }).click()
  await expect(page.getByText('No hay nada con este filtro.')).toBeVisible()
  await page.getByRole('button', { name: 'Actividad' }).click()
  await expect(page.getByRole('button', { name: /Natación/ })).toBeVisible()

  // En el calendario, el niño se elige de la lista.
  await page.getByRole('link', { name: 'Calendario' }).click()
  await expect(page.getByText('Evento · Ambos · Sofi')).toBeVisible()
  await page.getByRole('button', { name: '+ Evento' }).click()
  const nueva = page.getByRole('dialog', { name: 'Nuevo evento' })
  await expect(nueva.getByLabel('Tipo', { exact: true })).toHaveCount(0)
  await expect(nueva.getByLabel('Niño').locator('option')).toHaveText(['Ninguno', 'Sofi'])
})
