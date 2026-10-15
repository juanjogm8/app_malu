// Resúmenes por Telegram: diario (8:00) y semanal (domingo 19:00), hora de la Ciudad de México.
// pg_cron la llama cada hora en punto; aquí se decide a quién le toca.
import type { CalendarData } from '../_shared/calendario.ts'
import type { AppSettings, Member } from '../_shared/db.ts'
import { dow, today, ZONA } from '../_shared/fechas.ts'
import { mismoSecreto } from '../_shared/telegram-api.ts'
import { avisoPush, esc, resumenDiario, resumenSemanal } from '../_shared/telegram-texto.ts'
import {
  avisoPendientes,
  avisoRecordatorio,
  pendientesPorRecordar,
  recordatoriosPorEnviar,
} from '../_shared/recordatorios.ts'
import type { TipoPendiente } from '../_shared/recordatorios.ts'

export type Tipo = 'diario' | 'semanal'

export interface Deps {
  secreto: string | undefined
  ahora: () => Date
  appUrl: string
  ajustes: () => Promise<AppSettings | null>
  miembros: () => Promise<Member[]>
  calendario: () => Promise<CalendarData>
  /** Registra el envío; devuelve false si ya se había mandado ese día (evita duplicados). */
  marcar: (memberId: string, tipo: Tipo, dia: string) => Promise<boolean>
  enviar: (chatId: number, html: string) => Promise<unknown>
  /** Personas con notificaciones push en algún dispositivo. */
  conPush: () => Promise<Set<string>>
  push: (
    memberId: string,
    aviso: { title: string; body: string; url: string; tag: string },
  ) => Promise<unknown>
  /** Registra un recordatorio; devuelve false si ya se había mandado (evita duplicados). */
  marcarRecordatorio: (
    eventId: string,
    fecha: string,
    hora: string,
    memberId: string,
  ) => Promise<boolean>
  /** Igual para pendientes (por pendiente, fecha, tipo y persona). */
  marcarPendiente: (
    taskId: string,
    dueDate: string,
    tipo: TipoPendiente,
    memberId: string,
  ) => Promise<boolean>
}

export const HORA_SEMANAL = 19
export const TITULO_DIARIO = 'Revisa tu día'
export const HORA_DIARIO = 8

/** Hora (0–23) en la Ciudad de México. */
export function horaLocal(d: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hourCycle: 'h23' }).format(
      d,
    ),
  )
}

/** A quién le toca cada resumen en esta hora. */
export function quienRecibe(
  miembros: Member[],
  ajustes: AppSettings | null,
  ahora: Date,
  conPush: Set<string> = new Set(),
) {
  const hora = horaLocal(ahora)
  const domingo = dow(today(ahora)) === 6
  const porPersona = ajustes?.telegram_digest_per_person ?? false
  // Reciben quienes tienen Telegram conectado o notificaciones push en algún dispositivo.
  const vinculados = miembros.filter((m) => m.telegram_chat_id || conPush.has(m.id))
  return {
    diario: vinculados.filter((m) =>
      porPersona ? m.digest_daily && m.digest_daily_hour === hora : hora === HORA_DIARIO,
    ),
    semanal: vinculados.filter(
      (m) => domingo && hora === HORA_SEMANAL && (!porPersona || m.digest_weekly),
    ),
  }
}

export async function manejarDigest(req: Request, d: Deps): Promise<Response> {
  if (!mismoSecreto(req.headers.get('x-digest-secret'), d.secreto)) {
    return new Response('no autorizado', { status: 401 })
  }
  // { "forzar": "diario" | "semanal" } manda ya, a todos los vinculados (para probar).
  let forzar: Tipo | null = null
  let recordatorios = false
  try {
    const body = await req.json()
    if (body?.forzar === 'diario' || body?.forzar === 'semanal') forzar = body.forzar
    recordatorios = body?.tipo === 'recordatorios'
  } catch {
    /* sin cuerpo */
  }
  if (recordatorios) return manejarRecordatorios(d)

  const ahora = d.ahora()
  const dia = today(ahora)
  const [miembros, ajustes, push] = await Promise.all([d.miembros(), d.ajustes(), d.conPush()])
  const alcanzables = miembros.filter((m) => m.telegram_chat_id || push.has(m.id))
  const toca = forzar
    ? {
        diario: forzar === 'diario' ? alcanzables : [],
        semanal: forzar === 'semanal' ? alcanzables : [],
      }
    : quienRecibe(miembros, ajustes, ahora, push)
  const mandar = async (m: Member, html: string, tipo: Tipo) => {
    if (m.telegram_chat_id) await d.enviar(m.telegram_chat_id, html)
    if (push.has(m.id))
      await d.push(m.id, {
        ...avisoPush(html),
        // El diario se anuncia corto; la lista de lo de hoy va en el cuerpo.
        ...(tipo === 'diario' && { title: TITULO_DIARIO }),
        url: tipo === 'semanal' ? '/revision' : '/',
        tag: `resumen-${tipo}`,
      })
  }

  const enviados: string[] = []
  if (toca.diario.length || toca.semanal.length) {
    const ctx = { data: await d.calendario(), members: miembros, today: dia }
    for (const m of toca.diario) {
      const texto = resumenDiario(ctx, m)
      if (texto && (forzar || (await d.marcar(m.id, 'diario', dia)))) {
        await mandar(m, texto, 'diario')
        enviados.push(`diario:${m.id}`)
      }
    }
    for (const m of toca.semanal) {
      if (forzar || (await d.marcar(m.id, 'semanal', dia))) {
        await mandar(m, resumenSemanal(ctx, m, d.appUrl), 'semanal')
        enviados.push(`semanal:${m.id}`)
      }
    }
  }
  return Response.json({ enviados })
}

/** Recordatorios de eventos y pendientes (pg_cron cada minuto con { "tipo": "recordatorios" }). */
export async function manejarRecordatorios(d: Deps): Promise<Response> {
  const [miembros, push, data] = await Promise.all([d.miembros(), d.conPush(), d.calendario()])
  const enviados: string[] = []
  for (const r of recordatoriosPorEnviar(data.events, miembros, d.ahora())) {
    const aviso = avisoRecordatorio(r)
    for (const id of r.para) {
      const m = miembros.find((x) => x.id === id)!
      if (!m.telegram_chat_id && !push.has(id)) continue
      if (!(await d.marcarRecordatorio(r.event.id, r.date, r.time, id))) continue
      if (m.telegram_chat_id)
        await d.enviar(m.telegram_chat_id, `⏰ <b>${esc(aviso.title)}</b>\n${esc(aviso.body)}`)
      if (push.has(id))
        await d.push(id, { ...aviso, url: '/calendario', tag: `evento-${r.event.id}-${r.date}` })
      enviados.push(`${r.event.id}:${r.date}:${id}`)
    }
  }
  // Pendientes: una sola notificación por persona y tipo con lo nuevo que toque.
  for (const g of pendientesPorRecordar(data.tasks, miembros, d.ahora())) {
    const m = miembros.find((x) => x.id === g.memberId)!
    if (!m.telegram_chat_id && !push.has(m.id)) continue
    const nuevos = []
    for (const t of g.tasks)
      if (await d.marcarPendiente(t.id, t.due_date!, g.tipo, m.id)) nuevos.push(t)
    if (!nuevos.length) continue
    const aviso = avisoPendientes(g.tipo, nuevos)
    if (m.telegram_chat_id)
      await d.enviar(m.telegram_chat_id, `📌 <b>${esc(aviso.title)}</b>\n${esc(aviso.body)}`)
    if (push.has(m.id))
      await d.push(m.id, { ...aviso, url: '/pendientes', tag: `pendientes-${g.tipo}` })
    enviados.push(...nuevos.map((t) => `${g.tipo}:${t.id}:${m.id}`))
  }
  return Response.json({ recordatorios: enviados })
}
