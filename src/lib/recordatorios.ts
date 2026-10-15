/*
 * Recordatorios: eventos unos minutos antes de empezar y pendientes la víspera, el día y si se pasan.
 * Puro: lo usa la Edge Function `digest` (copia en supabase/functions/_shared/recordatorios.ts).
 * Las horas son de la Ciudad de México.
 */
import type { CalendarEvent, Member, Task } from '@/types/db'
import { addDays, fTime, parse } from './fechas'
import { aHoraLocal, conNino } from './gcal'
import { isOpen } from './pendientes'
import { occDates } from './recurrencia'

export const MINUTOS_ANTES = 30

export interface Recordatorio {
  event: CalendarEvent
  /** Fecha y hora (HH:MM) de esta ocurrencia. */
  date: string
  time: string
  /** Minutos que faltan cuando se manda. */
  minutos: number
  /** Ids de quienes lo reciben. */
  para: string[]
}

const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/**
 * Eventos con hora que empiezan dentro de los próximos `minutos` (incluye los que se repiten).
 * Cada uno va a su dueño; los de "Ambos" o sin dueño, a los dos. Quien apagó sus recordatorios no
 * recibe nada. Lo que ya se mandó lo filtra quien llama (bitácora en la base).
 */
export function recordatoriosPorEnviar(
  events: CalendarEvent[],
  members: Pick<Member, 'id' | 'event_reminders'>[],
  ahora: Date,
  minutos = MINUTOS_ANTES,
): Recordatorio[] {
  const local = aHoraLocal(ahora.toISOString())
  const hoy = local.date
  const ahoraMin = aMinutos(local.time)
  const activos = members.filter((m) => m.event_reminders !== false)
  const out: Recordatorio[] = []
  for (const ev of events) {
    if (!ev.time) continue
    const time = ev.time.slice(0, 5)
    for (const date of occDates(ev.date, ev.repeat, hoy, addDays(hoy, 1))) {
      const dias = Math.round((parse(date).getTime() - parse(hoy).getTime()) / 86_400_000)
      const faltan = dias * 1440 + aMinutos(time) - ahoraMin
      if (faltan <= 0 || faltan > minutos) continue
      const para = activos
        .filter((m) => ev.is_shared || !ev.owner_id || ev.owner_id === m.id)
        .map((m) => m.id)
      if (para.length) out.push({ event: ev, date, time, minutos: faltan, para })
    }
  }
  return out
}

/** "En 30 min: Dentista" · "10:00 · Consultorio Roma". */
export function avisoRecordatorio(r: Recordatorio): { title: string; body: string } {
  const titulo = conNino(r.event.title, r.event.kid)
  const cuando = r.minutos <= 1 ? 'Ya casi' : `En ${r.minutos} min`
  return {
    title: `${cuando}: ${titulo}`,
    body: [fTime(r.time), r.event.place].filter(Boolean).join(' · '),
  }
}

/* ---------- Pendientes ---------- */

/** antes: la víspera a las 20:00 · hoy: el día a las 9:00 · tarde: al día siguiente a las 9:00. */
export type TipoPendiente = 'antes' | 'hoy' | 'tarde'
export const HORA_VISPERA = 20
export const HORA_DIA = 9

export interface RecordatorioPendientes {
  memberId: string
  tipo: TipoPendiente
  tasks: Task[]
}

/**
 * Pendientes con fecha que tocan avisar ahora, agrupados por persona y tipo. Al responsable; a los
 * dos si es de "Ambos" o no tiene responsable. No se avisa a quien lo creó hace menos de una hora.
 * Lo que ya se mandó lo filtra quien llama (bitácora en la base).
 */
export function pendientesPorRecordar(
  tasks: Task[],
  members: Pick<Member, 'id' | 'task_reminders'>[],
  ahora: Date,
): RecordatorioPendientes[] {
  const local = aHoraLocal(ahora.toISOString())
  const hoy = local.date
  const hora = Number(local.time.slice(0, 2))
  const toca: [TipoPendiente, string][] = []
  if (hora >= HORA_VISPERA) toca.push(['antes', addDays(hoy, 1)])
  if (hora >= HORA_DIA) toca.push(['hoy', hoy], ['tarde', addDays(hoy, -1)])
  const recien = ahora.getTime() - 60 * 60 * 1000
  const out: RecordatorioPendientes[] = []
  for (const m of members) {
    if (m.task_reminders === false) continue
    for (const [tipo, fecha] of toca) {
      const suyos = tasks.filter(
        (t) =>
          isOpen(t) &&
          t.due_date === fecha &&
          (t.is_shared || !t.assignee_id || t.assignee_id === m.id) &&
          !(t.created_by === m.id && Date.parse(t.created_at) > recien),
      )
      if (suyos.length) out.push({ memberId: m.id, tipo, tasks: suyos })
    }
  }
  return out
}

const TITULO_PENDIENTES: Record<TipoPendiente, [string, (n: number) => string]> = {
  antes: ['Mañana', (n) => `Mañana vencen ${n} pendientes`],
  hoy: ['Hoy', (n) => `Hoy vencen ${n} pendientes`],
  tarde: ['Se pasó', (n) => `Se pasaron ${n} pendientes`],
}

/** "Hoy: Pagar predial" o "Hoy vencen 3 pendientes" con la lista. */
export function avisoPendientes(
  tipo: TipoPendiente,
  tasks: Pick<Task, 'text'>[],
  maxLineas = 4,
): { title: string; body: string } {
  const [uno, varios] = TITULO_PENDIENTES[tipo]
  if (tasks.length === 1)
    return {
      title: `${uno}: ${tasks[0]!.text}`,
      body: tipo === 'tarde' ? 'Sigue sin marcarse como hecho.' : 'Toca para verlo en Pendientes.',
    }
  const lineas = tasks.slice(0, maxLineas).map((t) => `• ${t.text}`)
  if (tasks.length > maxLineas) lineas.push(`…y ${tasks.length - maxLineas} más`)
  return { title: varios(tasks.length), body: lineas.join('\n') }
}
