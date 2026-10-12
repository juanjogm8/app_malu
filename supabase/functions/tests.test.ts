// Pruebas de las Edge Functions (Deno). Uso: pnpm test:functions
import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import type { CalendarData } from './_shared/calendario.ts'
import type { AppSettings, Member } from './_shared/db.ts'
import { horaLocal, manejarDigest, quienRecibe } from './digest/manejar.ts'
import type { Tipo } from './digest/manejar.ts'
import { manejar } from './telegram-webhook/manejar.ts'
import type { Deps } from './telegram-webhook/manejar.ts'

const miembro = (
  id: string,
  name: string,
  chat: number | null,
  o: Partial<Member> = {},
): Member => ({
  id,
  email: `${id}@x.com`,
  name,
  color: 'azul',
  avatar_url: null,
  telegram_chat_id: chat,
  created_at: '',
  digest_daily: true,
  digest_daily_hour: 8,
  digest_weekly: true,
  ...o,
})
const YO = miembro('yo', 'Juanjo Gamur', 111)
const MALU = miembro('malu', 'Malu Ramírez', 222)
const vacio: CalendarData = { events: [], tasks: [], dates: [], kids: [], plans: [], meals: [] }
const a = { created_by: null, created_at: '', updated_at: '' }

function webhook(over: Partial<Deps> = {}) {
  const enviados: [number, string][] = []
  const agregados: string[] = []
  const pendientes: [string, string | null][] = []
  const deps: Deps = {
    secreto: 's3cr3t',
    hoy: () => '2026-10-12',
    miembroPorChat: async (id) => [YO, MALU].find((m) => m.telegram_chat_id === id) ?? null,
    vincular: async (codigo) => (codigo === 'ABC12345' ? YO : null),
    miembros: async () => [YO, MALU],
    calendario: async () => vacio,
    superItems: async () => [],
    agregarSuper: async (t) => (agregados.push(t), 'nuevo'),
    crearPendiente: async (t, d) => void pendientes.push([t, d]),
    enviar: async (c, h) => void enviados.push([c, h]),
    ...over,
  }
  const enviar = (text: string, chat = 111, secreto = 's3cr3t') =>
    manejar(
      new Request('https://x/telegram-webhook', {
        method: 'POST',
        headers: { 'x-telegram-bot-api-secret-token': secreto },
        body: JSON.stringify({ message: { chat: { id: chat }, text } }),
      }),
      deps,
    )
  return { enviar, enviados, agregados, pendientes }
}

Deno.test('webhook: rechaza peticiones sin el secreto', async () => {
  const w = webhook()
  assertEquals((await w.enviar('/hoy', 111, 'otro')).status, 401)
  assertEquals(w.enviados.length, 0)
})

Deno.test('webhook: /start con código vincula; con código malo avisa', async () => {
  const w = webhook({ miembroPorChat: async () => null })
  await w.enviar('/start abc12345', 999)
  assertStringIncludes(w.enviados[0]![1], 'Listo, Juanjo')
  await w.enviar('/start NOSIRVE', 999)
  assertStringIncludes(w.enviados[1]![1], 'no sirve')
})

Deno.test('webhook: ignora chats no vinculados', async () => {
  const w = webhook()
  await w.enviar('/agregar leche', 555)
  assertEquals(w.enviados.length, 0)
  assertEquals(w.agregados.length, 0)
})

Deno.test('webhook: /agregar y /super con texto agregan al súper', async () => {
  const w = webhook()
  await w.enviar('/agregar leche')
  await w.enviar('/super@CasaBot huevo')
  assertEquals(w.agregados, ['leche', 'huevo'])
  assertStringIncludes(w.enviados[0]![1], 'Agregué <b>leche</b>')
})

Deno.test('webhook: /pendiente con fecha', async () => {
  const w = webhook()
  await w.enviar('/pendiente pagar predial 15/11')
  assertEquals(w.pendientes, [['pagar predial', '2026-11-15']])
  assertStringIncludes(w.enviados[0]![1], 'para el 15/11')
})

Deno.test('webhook: /hoy sin nada', async () => {
  const w = webhook()
  await w.enviar('/hoy')
  assertStringIncludes(w.enviados[0]![1], 'Nada para hoy')
})

// 14:00 UTC = 8:00 en la Ciudad de México (UTC−6, sin horario de verano)
const LUNES_8 = new Date('2026-10-12T14:00:00Z')
const DOMINGO_19 = new Date('2026-10-19T01:00:00Z') // domingo 18 oct, 19:00 local

Deno.test('digest: hora local de la Ciudad de México', () => {
  assertEquals(horaLocal(LUNES_8), 8)
  assertEquals(horaLocal(DOMINGO_19), 19)
})

Deno.test(
  'digest: con el flag apagado, diario a las 8 y semanal el domingo a las 19 para los dos',
  () => {
    const ajustes: AppSettings = { id: true, telegram_digest_per_person: false, updated_at: '' }
    const sinChat = miembro('x', 'X', null)
    const malu9 = { ...MALU, digest_daily_hour: 9, digest_weekly: false }
    const t1 = quienRecibe([YO, malu9, sinChat], ajustes, LUNES_8)
    assertEquals(
      t1.diario.map((m) => m.id),
      ['yo', 'malu'],
    )
    assertEquals(t1.semanal.length, 0)
    const t2 = quienRecibe([YO, malu9], ajustes, DOMINGO_19)
    assertEquals(
      t2.semanal.map((m) => m.id),
      ['yo', 'malu'],
    )
  },
)

Deno.test('digest: con el flag encendido, cada quien su hora y su semanal', () => {
  const ajustes: AppSettings = { id: true, telegram_digest_per_person: true, updated_at: '' }
  const malu9 = { ...MALU, digest_daily_hour: 9, digest_weekly: false }
  assertEquals(
    quienRecibe([YO, malu9], ajustes, LUNES_8).diario.map((m) => m.id),
    ['yo'],
  )
  assertEquals(
    quienRecibe([YO, malu9], ajustes, DOMINGO_19).semanal.map((m) => m.id),
    ['yo'],
  )
})

Deno.test('digest: manda a cada quien lo suyo y no repite el mismo día', async () => {
  const data: CalendarData = {
    ...vacio,
    events: [
      {
        ...a,
        id: 'e1',
        title: 'Dentista de Malu',
        date: '2026-10-12',
        time: '10:00:00',
        repeat: null,
        owner_id: 'malu',
        is_shared: false,
        place: null,
        notes: null,
      },
      {
        ...a,
        id: 'e2',
        title: 'Junta',
        date: '2026-10-12',
        time: '08:30:00',
        repeat: null,
        owner_id: null,
        is_shared: true,
        place: null,
        notes: null,
      },
    ],
  }
  const log = new Set<string>()
  const enviados: [number, string][] = []
  const avisos: [string, string][] = []
  const deps = {
    secreto: 'k',
    ahora: () => LUNES_8,
    appUrl: 'https://casa.vercel.app',
    ajustes: async () => null,
    miembros: async () => [YO, MALU, miembro('sinTelegram', 'Sin Telegram', null)],
    calendario: async () => data,
    marcar: async (id: string, tipo: Tipo, dia: string) => {
      const k = `${id}:${tipo}:${dia}`
      if (log.has(k)) return false
      log.add(k)
      return true
    },
    enviar: async (c: number, h: string) => void enviados.push([c, h]),
    conPush: async () => new Set(['malu', 'sinTelegram']),
    push: async (id: string, aviso: { title: string; body: string }) =>
      void avisos.push([id, aviso.title]),
  }
  const pedir = (secreto = 'k') =>
    manejarDigest(
      new Request('https://x/digest', { method: 'POST', headers: { 'x-digest-secret': secreto } }),
      deps,
    )
  assertEquals((await pedir('mal')).status, 401)
  await pedir()
  assertEquals(enviados.length, 2)
  const paraMi = enviados.find(([c]) => c === 111)![1]
  const paraMalu = enviados.find(([c]) => c === 222)![1]
  assert(!paraMi.includes('Dentista de Malu'))
  assertStringIncludes(paraMalu, 'Dentista de Malu')
  assertStringIncludes(paraMi, 'Junta')
  // Push: a quien tiene dispositivos suscritos, aunque no tenga Telegram.
  assertEquals(avisos.map(([id]) => id).sort(), ['malu', 'sinTelegram'])
  assertEquals(avisos[0]![1], 'Revisa tu día')
  await pedir()
  assertEquals(enviados.length, 2, 'no se repite el mismo día')
  assertEquals(avisos.length, 2)
})

// ---------- Google Calendar ----------
import { firmar, verificar } from './_shared/firma.ts'
import { publicar, sincronizarLectura } from './_shared/gcal-sync-core.ts'
import type { FilaGoogle, GoogleEvent } from './_shared/gcal.ts'
import { GoogleError } from './_shared/google-api.ts'
import type { CalendarApi, PaginaEventos } from './_shared/google-api.ts'
import type { CalendarEvent } from './_shared/db.ts'

Deno.test('firma: el state se verifica, caduca y no se puede alterar', async () => {
  const t = await firmar({ m: 'yo', w: true }, 'k')
  assertEquals(await verificar(t, 'k'), { m: 'yo', w: true })
  assertEquals(await verificar(t, 'otra'), null)
  assertEquals(await verificar(t.replace(/^./, 'x'), 'k'), null)
  assertEquals(await verificar(await firmar({ m: 'yo' }, 'k', -1), 'k'), null)
})

function apiFalsa(paginas: (PaginaEventos | GoogleError)[]) {
  const llamadas: Record<string, string | undefined>[] = []
  const creados: GoogleEvent[] = []
  const borrados: string[] = []
  const api: CalendarApi = {
    listar: async (_c, q) => {
      llamadas.push(q)
      const p = paginas.shift()!
      if (p instanceof GoogleError) throw p
      return p
    },
    crear: async (_c, ev) => (creados.push(ev), { ...ev, id: `g-${creados.length}`, etag: 'e1' }),
    actualizar: async (_c, id, ev) => {
      if (id === 'borrado-en-google') throw new GoogleError(404, 'no')
      return { ...ev, id, etag: 'e2' }
    },
    borrar: async (_c, id) => void borrados.push(id),
    crearCalendario: async () => ({ id: 'cal' }),
  }
  return { api, llamadas, creados, borrados }
}

function almacen(token: string | null) {
  const filas = new Map<string, FilaGoogle>()
  const estado = { token, vaciado: 0 }
  return {
    filas,
    estado,
    a: {
      leerSyncToken: async () => estado.token,
      guardarSyncToken: async (_m: string, _c: string, t: string | null) => void (estado.token = t),
      vaciar: async () => void (filas.clear(), estado.vaciado++),
      guardar: async (fs: FilaGoogle[]) => fs.forEach((f) => filas.set(f.google_event_id, f)),
      borrar: async (_m: string, _c: string, ids: string[]) => ids.forEach((i) => filas.delete(i)),
    },
  }
}

Deno.test('google: sincronización completa con páginas y luego incremental', async () => {
  const { api, llamadas } = apiFalsa([
    { items: [{ id: 'a', summary: 'A', start: { date: '2026-10-13' } }], nextPageToken: 'p2' },
    {
      items: [{ id: 'b', summary: 'B', start: { dateTime: '2026-10-14T16:00:00Z' } }],
      nextSyncToken: 's1',
    },
    {
      items: [
        { id: 'a', status: 'cancelled' },
        { id: 'c', summary: 'C', start: { date: '2026-10-15' } },
      ],
      nextSyncToken: 's2',
    },
  ])
  const s = almacen(null)
  await sincronizarLectura(api, s.a, 'yo', 'primary', '2026-10-12')
  assertEquals([...s.filas.keys()], ['a', 'b'])
  assertEquals(s.estado.token, 's1')
  assertEquals(llamadas[0], { timeMin: '2026-09-12T00:00:00Z', pageToken: undefined })
  assertEquals(llamadas[1]!.pageToken, 'p2')
  await sincronizarLectura(api, s.a, 'yo', 'primary', '2026-10-12')
  assertEquals(llamadas[2], { syncToken: 's1', pageToken: undefined })
  assertEquals([...s.filas.keys()].sort(), ['b', 'c'])
  assertEquals(s.estado.token, 's2')
})

Deno.test('google: un 410 borra lo copiado y repite completa', async () => {
  const { api, llamadas } = apiFalsa([
    new GoogleError(410, 'gone'),
    { items: [{ id: 'z', summary: 'Z', start: { date: '2026-10-13' } }], nextSyncToken: 'nuevo' },
  ])
  const s = almacen('viejo')
  s.filas.set('x', { google_event_id: 'x' } as FilaGoogle)
  await sincronizarLectura(api, s.a, 'yo', 'primary', '2026-10-12')
  assertEquals([...s.filas.keys()], ['z'])
  assertEquals(s.estado.token, 'nuevo')
  assertEquals(llamadas[1]!.syncToken, undefined)
})

Deno.test(
  'google: publica eventos pendientes, recrea los borrados a mano y aplica borrados',
  async () => {
    const { api, creados, borrados } = apiFalsa([])
    const ev = (id: string, gid: string | null): CalendarEvent => ({
      id,
      created_by: null,
      created_at: '',
      updated_at: '',
      title: `Ev ${id}`,
      date: '2026-10-20',
      time: null,
      repeat: null,
      owner_id: null,
      is_shared: true,
      place: null,
      notes: null,
      google_event_id: gid,
    })
    const publicados: [string, string][] = []
    const pendientesBorrar = ['viejo']
    const n = await publicar(
      api,
      {
        pendientes: async () => [
          ev('1', null),
          ev('2', 'g-existente'),
          ev('3', 'borrado-en-google'),
        ],
        marcarPublicado: async (id, gid) => void publicados.push([id, gid]),
        borradosPendientes: async () => [...pendientesBorrar],
        quitarBorrado: async (id) => void pendientesBorrar.splice(pendientesBorrar.indexOf(id), 1),
      },
      'cal',
    )
    assertEquals(n, 3)
    assertEquals(borrados, ['viejo'])
    assertEquals(pendientesBorrar, [])
    assertEquals(publicados, [
      ['1', 'g-1'],
      ['2', 'g-existente'],
      ['3', 'g-2'],
    ])
    assertEquals(creados.length, 2)
  },
)
