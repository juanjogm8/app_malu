// ⚠ Copia generada por `pnpm sync:shared`. Edita el original en src/.
/*
 * Recordatorios de eventos: un aviso a cada persona del evento unos minutos antes de que empiece.
 * Puro: lo usa la Edge Function `digest` (copia en supabase/functions/_shared/recordatorios.ts).
 * Las horas de los eventos son de la Ciudad de México.
 */
import type { CalendarEvent, Member } from './db.ts'
import { addDays, fTime, parse } from './fechas.ts'
import { aHoraLocal, conNino } from './gcal.ts'
import { occDates } from './recurrencia.ts'

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
