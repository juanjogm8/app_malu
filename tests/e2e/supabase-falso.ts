/*
 * Supabase simulado para Playwright: REST (PostgREST) en memoria, la función complete_task y el
 * WebSocket de Realtime (acepta la suscripción y retransmite los cambios a las demás pestañas).
 * Permite probar la interfaz sin un proyecto real.
 */
import type { BrowserContext, Page, WebSocketRoute } from '@playwright/test'
import { addDays, today } from '../../src/lib/fechas'
import { nextAfter } from '../../src/lib/recurrencia'
import type { Repeat } from '../../src/lib/recurrencia'

export const URL_SUPABASE = 'http://127.0.0.1:9'
export const YO = '00000000-0000-0000-0000-00000000000a'
export const MALU = '00000000-0000-0000-0000-00000000000b'

type Fila = Record<string, unknown> & { id: string }
export type Db = Record<string, Fila[]>

const usuario = {
  id: YO,
  email: 'juanjogamur@gmail.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: { full_name: 'Juanjo Gamur' },
  created_at: '2026-10-01T00:00:00Z',
}

let n = 0
const audit = (by: string = YO) => {
  const ts = new Date(Date.UTC(2026, 9, 1, 0, n++)).toISOString()
  return { created_by: by, created_at: ts, updated_at: ts }
}
const uid = () => crypto.randomUUID()

export function dbVacia(): Db {
  return {
    members: [
      {
        id: YO,
        email: usuario.email,
        name: 'Juanjo Gamur',
        color: 'azul',
        avatar_url: null,
        telegram_chat_id: null,
        created_at: '2026-10-01T00:00:00Z',
        digest_daily: true,
        digest_daily_hour: 8,
        digest_weekly: true,
      },
      {
        id: MALU,
        email: 'maria.rodriguez.91@gmail.com',
        name: 'Malu Ramírez',
        color: 'teja',
        avatar_url: null,
        telegram_chat_id: null,
        created_at: '2026-10-01T01:00:00Z',
        digest_daily: true,
        digest_daily_hour: 8,
        digest_weekly: true,
      },
    ],
    app_settings: [
      { id: true as unknown as string, telegram_digest_per_person: false, updated_at: '' },
    ],
    google_accounts: [],
    google_events: [],
    tasks: [],
    events: [],
    kids: [],
    important_dates: [],
    meals: [],
    plans: [],
    notes: [],
    contacts: [],
    shopping_items: [],
    purchases: [],
    home_improvements: [],
  }
}

const tarea = (o: Partial<Fila>) => ({
  id: uid(),
  ...audit(),
  text: '',
  assignee_id: null,
  is_shared: false,
  due_date: null,
  priority: 'media',
  category: 'Casa',
  repeat: null,
  rotate: false,
  notes: null,
  done: false,
  done_on: null,
  last_done_on: null,
  last_done_by: null,
  ...o,
})

/** Datos de ejemplo parecidos a los del diseño, relativos a hoy. */
export function dbEjemplo(): Db {
  const h = today()
  const d = (k: number) => addDays(h, k)
  const db = dbVacia()
  db.tasks = [
    tarea({ text: 'Cambiar foco del pasillo', assignee_id: MALU, due_date: d(-4) }),
    tarea({
      text: 'Revisar colegiatura',
      assignee_id: MALU,
      due_date: h,
      repeat: 'mensual',
      category: 'Pagos',
      last_done_on: d(-30),
    }),
    tarea({
      text: 'Pagar la luz',
      is_shared: true,
      due_date: d(3),
      repeat: 'bimestral',
      priority: 'alta',
      category: 'Pagos',
    }),
    tarea({
      text: 'Renovar seguro del coche',
      assignee_id: YO,
      due_date: d(12),
      priority: 'alta',
      category: 'Coche',
    }),
    tarea({
      text: 'Llevar el coche al servicio',
      assignee_id: YO,
      due_date: d(39),
      repeat: 'semestral',
      category: 'Coche',
      last_done_on: d(-145),
    }),
    tarea({ text: 'Arreglar la puerta del clóset' }),
    tarea({ text: 'Comprar foco', done: true, done_on: d(-1) }),
  ]
  db.events = [
    {
      id: uid(),
      ...audit(),
      title: 'Junta de la escuela',
      date: h,
      time: '08:30:00',
      repeat: null,
      owner_id: null,
      is_shared: true,
      place: null,
      notes: null,
    },
    {
      id: uid(),
      ...audit(),
      title: 'Dentista',
      date: d(1),
      time: '10:00:00',
      repeat: null,
      owner_id: YO,
      is_shared: false,
      place: null,
      notes: null,
    },
    {
      id: uid(),
      ...audit(MALU),
      title: 'Natación',
      date: d(-7),
      time: '17:00:00',
      repeat: 'semanal',
      owner_id: MALU,
      is_shared: false,
      place: null,
      notes: null,
    },
  ]
  db.important_dates = [
    {
      id: uid(),
      ...audit(),
      name: 'Mamá',
      kind: 'cumple',
      date: `1962-${d(5).slice(5)}`,
      yearly: true,
      remind_days: 7,
      notes: null,
    },
    {
      id: uid(),
      ...audit(),
      name: 'Seguro del coche',
      kind: 'vence',
      date: d(12),
      yearly: false,
      remind_days: 30,
      notes: null,
    },
  ]
  db.kids = [{ id: uid(), ...audit(MALU), name: 'Emilia' }]
  db.events.push(
    {
      id: uid(),
      ...audit(MALU),
      title: 'Vacuna refuerzo',
      date: d(4),
      time: '09:00:00',
      repeat: null,
      owner_id: null,
      is_shared: true,
      place: null,
      notes: null,
      kid: 'Emilia',
      kid_kind: 'vacuna',
    },
    {
      id: uid(),
      ...audit(),
      title: 'Revisión con el pediatra',
      date: d(10),
      time: null,
      repeat: null,
      owner_id: null,
      is_shared: true,
      place: null,
      notes: null,
      kid: 'Emilia',
      kid_kind: 'cita',
    },
  )
  db.plans = [
    {
      id: uid(),
      ...audit(),
      text: 'Cena con amigos',
      kind: 'restaurante',
      status: 'planeado',
      date: h,
      place: null,
      link: null,
      notes: null,
    },
  ]
  db.plans.push(
    {
      id: uid(),
      ...audit(MALU),
      text: 'Probar la fonda nueva de Coyoacán',
      kind: 'restaurante',
      status: 'idea',
      date: null,
      place: 'Coyoacán',
      link: 'https://example.com/fonda',
      notes: null,
    },
    {
      id: uid(),
      ...audit(),
      text: 'Picnic en Chapultepec',
      kind: 'finde',
      status: 'idea',
      date: null,
      place: null,
      link: null,
      notes: null,
    },
  )
  const lunes = addDays(h, -((new Date(`${h}T12:00:00Z`).getUTCDay() + 6) % 7))
  const comida = (k: number, meal: string, text: string, ingredients: string | null) => ({
    id: uid(),
    ...audit(),
    date: addDays(lunes, k),
    meal,
    text,
    ingredients,
  })
  db.meals = [
    comida(0, 'comida', 'Sopa de lentejas', 'Lentejas, jitomate, cebolla'),
    comida(1, 'comida', 'Tacos de pollo', 'Pechuga de pollo, tortillas, aguacate, limón'),
    comida(3, 'cena', 'Pozole', 'Maíz pozolero, carne de cerdo, rábanos'),
  ]
  db.notes = [
    {
      id: uid(),
      ...audit(MALU),
      title: 'Clave del wifi',
      body: 'Red CasaOrden_5G. La clave está en la etiqueta del módem, atrás de la tele.',
    },
    {
      id: uid(),
      ...audit(),
      title: 'Medidas de la sala',
      body: 'Ventana grande 2.40 × 1.60 m. Pared de la tele 3.10 m.',
    },
  ]
  db.contacts = [
    {
      id: uid(),
      ...audit(),
      name: 'Don Pedro',
      role: 'Plomero',
      phone: '55 1234 5678',
      notes: null,
    },
    {
      id: uid(),
      ...audit(),
      name: 'Dra. Ramírez',
      role: 'Pediatra',
      phone: '55 8765 4321',
      notes: null,
    },
  ]
  const s = (text: string, category: string, by: string, done = false) => ({
    id: uid(),
    ...audit(by),
    text,
    category,
    done,
  })
  db.shopping_items = [
    s('Jitomate 1 kg', 'frutas', YO, true),
    s('Aguacate', 'frutas', MALU),
    s('Cebolla', 'frutas', YO, true),
    s('Limón', 'frutas', MALU),
    s('Pechuga de pollo', 'carnes', MALU),
    s('Leche entera 2 L', 'lacteos', YO, true),
    s('Huevo', 'lacteos', MALU, true),
    s('Queso Oaxaca', 'lacteos', MALU),
    s('Tortillas de maíz', 'pan', YO),
    s('Bolillos', 'pan', YO, true),
    s('Frijoles', 'despensa', MALU),
    s('Aceite', 'despensa', YO, true),
    s('Café', 'despensa', YO),
    s('Agua 20 L', 'bebidas', YO),
    s('Fabuloso', 'limpieza', MALU, true),
    s('Papel de baño', 'limpieza', MALU),
    s('Shampoo', 'cuidado', MALU),
  ]
  const c = (
    text: string,
    store: string | null,
    price: number | null,
    priority: string,
    done = false,
  ) => ({ id: uid(), ...audit(), text, store, price, priority, done })
  db.purchases = [
    c('Licuadora', 'Liverpool', 1250, 'alta'),
    c('Tenis para correr', 'https://www.liverpool.com.mx/tenis', 2400, 'media'),
    c('Regalo de cumpleaños de Mamá', null, 600, 'alta'),
  ]
  const m = (text: string, area: string, price: number | null, status: string) => ({
    id: uid(),
    ...audit(),
    text,
    area,
    price,
    status,
  })
  db.home_improvements = [
    m('Pintar la sala', 'Sala y comedor', 8000, 'proceso'),
    m('Cambiar el calentador', 'Toda la casa', 6500, 'planeado'),
    m('Impermeabilizar', 'Toda la casa', 9500, 'planeado'),
    m('Persianas en recámaras', 'Recámaras', 12000, 'idea'),
    m('Huerto en la terraza', 'Terraza o jardín', 6000, 'idea'),
    m('Cambiar la llave de la cocina', 'Cocina', 1800, 'listo'),
  ]
  return db
}

/* ---------- PostgREST ---------- */

function filtro(url: URL): (r: Fila) => boolean {
  const conds: ((r: Fila) => boolean)[] = []
  for (const [k, v] of url.searchParams) {
    if (k === 'select' || k === 'on_conflict' || k === 'columns') continue
    if (v.startsWith('eq.')) conds.push((r) => String(r[k]) === v.slice(3))
    else if (v.startsWith('in.(')) {
      const set = v
        .slice(4, -1)
        .split(',')
        .map((x) => x.replace(/^"|"$/g, ''))
      conds.push((r) => set.includes(String(r[k])))
    }
  }
  return (r) => conds.every((c) => c(r))
}

/** Escucha los cambios para retransmitirlos por Realtime. */
type Oyente = (table: string, type: 'INSERT' | 'UPDATE' | 'DELETE', row: Fila) => void

export class SupabaseFalso {
  oyentes = new Set<Oyente>()
  /** Si es true, toda escritura responde 500. */
  fallar = false
  /** Si es true, la API no responde (simula estar sin red). */
  caido = false
  constructor(public db: Db = dbEjemplo()) {}

  private emitir(table: string, type: 'INSERT' | 'UPDATE' | 'DELETE', row: Fila) {
    for (const o of this.oyentes) o(table, type, row)
  }

  async instalar(ctx: BrowserContext | Page) {
    await ctx.route(`${URL_SUPABASE}/auth/v1/**`, (route) => {
      const u = new URL(route.request().url())
      if (u.pathname.endsWith('/user')) return route.fulfill({ json: usuario })
      if (u.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
      return route.fulfill({ json: {} })
    })
    await ctx.route(`${URL_SUPABASE}/rest/v1/**`, async (route) => {
      if (this.caido) return route.abort('internetdisconnected')
      const req = route.request()
      const u = new URL(req.url())
      const partes = u.pathname.split('/').filter(Boolean) // rest, v1, tabla | rpc, fn
      const metodo = req.method()
      const objeto = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')

      if (partes[2] === 'rpc') {
        if (this.fallar) return route.fulfill({ status: 500, json: { message: 'fallo' } })
        if (partes[3] === 'create_telegram_link_code') return route.fulfill({ json: 'AB12CD34' })
        if (partes[3] === 'unlink_telegram') {
          this.db.members!.find((m) => m.id === YO)!.telegram_chat_id = null
          return route.fulfill({ status: 204 })
        }
        const { p_id } = req.postDataJSON() as { p_id: string }
        return route.fulfill({ json: this.completar(p_id) })
      }
      const tabla = this.db[partes[2]!]
      if (!tabla) return route.fulfill({ status: 404, json: { message: 'sin tabla' } })
      const f = filtro(u)

      if (metodo === 'GET') {
        const filas = tabla.filter(f)
        return route.fulfill({ json: objeto ? (filas[0] ?? null) : filas })
      }
      if (this.fallar) return route.fulfill({ status: 500, json: { message: 'fallo' } })

      if (metodo === 'POST') {
        const body = req.postDataJSON() as Fila | Fila[]
        const filas = (Array.isArray(body) ? body : [body]).map((b) => {
          const existente = tabla.find((r) => r.id === b.id)
          if (existente) {
            Object.assign(existente, b)
            return existente
          }
          const nueva = { id: uid(), ...audit(), ...b } as Fila
          tabla.push(nueva)
          this.emitir(partes[2]!, 'INSERT', nueva)
          return nueva
        })
        return route.fulfill({ status: 201, json: objeto ? filas[0] : filas })
      }
      if (metodo === 'PATCH') {
        const patch = req.postDataJSON() as Partial<Fila>
        const filas = tabla.filter(f)
        for (const r of filas) {
          Object.assign(r, patch)
          this.emitir(partes[2]!, 'UPDATE', r)
        }
        return route.fulfill({ status: 204 })
      }
      if (metodo === 'DELETE') {
        const quitar = tabla.filter(f)
        this.db[partes[2]!] = tabla.filter((r) => !quitar.includes(r))
        for (const r of quitar) this.emitir(partes[2]!, 'DELETE', r)
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ status: 405 })
    })
    await ctx.route(`${URL_SUPABASE}/functions/v1/**`, (route) => {
      const u = new URL(route.request().url())
      if (u.pathname.endsWith('/gcal-auth'))
        return route.fulfill({
          json: { url: 'https://accounts.google.com/o/oauth2/v2/auth?prueba=1' },
        })
      return route.fulfill({ status: 404 })
    })
    await ctx.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => this.realtime(ws))
  }

  /** Igual que public.complete_task. */
  completar(id: string): Fila {
    const t = this.db.tasks!.find((r) => r.id === id)!
    const h = today()
    if (!t.repeat) {
      t.done = !t.done
      t.done_on = t.done ? h : null
    } else {
      t.due_date = nextAfter((t.due_date as string) ?? h, t.repeat as Repeat, h)
      t.last_done_on = h
      t.last_done_by = YO
      if (t.rotate && t.assignee_id) t.assignee_id = t.assignee_id === YO ? MALU : YO
    }
    this.emitir('tasks', 'UPDATE', t)
    return t
  }

  private realtime(ws: WebSocketRoute) {
    let topic = ''
    let joinRef: string | null = null
    let bindings: { id: number; event: string; schema: string; table: string }[] = []
    const enviar = (msg: unknown[]) => ws.send(JSON.stringify(msg))
    const oyente: Oyente = (table, type, row) => {
      if (!topic) return
      for (const b of bindings.filter((x) => x.table === table)) {
        enviar([
          null,
          null,
          topic,
          'postgres_changes',
          {
            ids: [b.id],
            data: {
              schema: 'public',
              table,
              commit_timestamp: new Date().toISOString(),
              type,
              columns: [],
              errors: null,
              record: type === 'DELETE' ? {} : row,
              old_record: type === 'DELETE' ? { id: row.id } : {},
            },
          },
        ])
      }
    }
    this.oyentes.add(oyente)
    ws.onClose(() => this.oyentes.delete(oyente))
    ws.onMessage((raw) => {
      const m = JSON.parse(String(raw)) as unknown
      const [jr, ref, t, event, payload] = Array.isArray(m)
        ? (m as [string | null, string, string, string, Record<string, unknown>])
        : [
            (m as Record<string, string>).join_ref ?? null,
            (m as Record<string, string>).ref,
            (m as Record<string, string>).topic,
            (m as Record<string, string>).event,
            (m as Record<string, Record<string, unknown>>).payload,
          ]
      if (event === 'phx_join') {
        topic = t
        joinRef = jr
        const pc = ((payload.config as Record<string, unknown>)?.postgres_changes ?? []) as {
          event: string
          schema: string
          table: string
        }[]
        bindings = pc.map((b, i) => ({ ...b, id: i + 1 }))
        enviar([
          jr,
          ref,
          t,
          'phx_reply',
          { status: 'ok', response: { postgres_changes: bindings } },
        ])
      } else {
        enviar([jr ?? joinRef, ref, t, 'phx_reply', { status: 'ok', response: {} }])
      }
    })
  }
}

/** Deja una sesión guardada para que la app entre directo. */
export async function iniciarSesion(page: Page) {
  await page.addInitScript(
    ([user]) => {
      localStorage.setItem(
        'sb-127-auth-token',
        JSON.stringify({
          access_token: 'falso',
          refresh_token: 'falso',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user,
        }),
      )
    },
    [usuario],
  )
}
