/*
 * Google Calendar (fase 3): conversión entre eventos de la app y de Google. Puro: lo usan las Edge
 * Functions (copia en supabase/functions/_shared/gcal.ts) y se prueba con Vitest.
 */
import type { CalendarEvent, KidItem } from '@/types/db'
import { addDays, parse, ZONA } from './fechas'
import type { Repeat } from './recurrencia'

/** Alcances de OAuth: lectura del calendario de cada persona; escritura solo en el calendario que crea la app. */
export const SCOPE_LECTURA = 'https://www.googleapis.com/auth/calendar.events.readonly'
export const SCOPE_ESCRITURA = 'https://www.googleapis.com/auth/calendar.app.created'
/** Marca en los eventos que publica la app, para no leerlos de vuelta como "Google". */
export const PROPIEDAD_APP = 'casaEnOrdenId'

/**
 * Regla de repetición equivalente a la de la app. Los meses cuentan desde la fecha original y, si el
 * día no existe, usan el último (31 → 30/28). En RFC 5545 eso es "el último de los días 28…d".
 */
export function rrule(repeat: Repeat | null | undefined, date: string): string[] | undefined {
  if (!repeat) return undefined
  const d = parse(date).getUTCDate()
  const mes = parse(date).getUTCMonth() + 1
  const diaMes =
    d <= 28
      ? `BYMONTHDAY=${d}`
      : `BYMONTHDAY=${Array.from({ length: d - 27 }, (_, i) => 28 + i).join(',')};BYSETPOS=-1`
  switch (repeat) {
    case 'semanal':
      return ['RRULE:FREQ=WEEKLY']
    case 'quincenal':
      return ['RRULE:FREQ=WEEKLY;INTERVAL=2']
    case 'mensual':
      return [`RRULE:FREQ=MONTHLY;${diaMes}`]
    case 'bimestral':
      return [`RRULE:FREQ=MONTHLY;INTERVAL=2;${diaMes}`]
    case 'trimestral':
      return [`RRULE:FREQ=MONTHLY;INTERVAL=3;${diaMes}`]
    case 'semestral':
      return [`RRULE:FREQ=MONTHLY;INTERVAL=6;${diaMes}`]
    case 'anual':
      return [`RRULE:FREQ=YEARLY;BYMONTH=${mes};${diaMes}`]
  }
}

export interface GoogleEvent {
  id?: string
  etag?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
  recurrence?: string[]
  extendedProperties?: { private?: Record<string, string> }
}

/** "Natación" + "Sofi" → "Natación · Sofi" (sin repetir el nombre si el título ya lo trae). */
export function conNino(titulo: string, kid: string | null | undefined): string {
  const k = kid?.trim()
  if (!k || titulo.toLocaleLowerCase('es').includes(k.toLocaleLowerCase('es'))) return titulo
  return `${titulo} · ${k}`
}

/** Evento de la app → recurso de Google (todo el día o de una hora, en hora de la Ciudad de México). */
export function eventoAGoogle(
  ev: Pick<CalendarEvent, 'id' | 'title' | 'date' | 'time' | 'repeat' | 'place' | 'notes' | 'kid'>,
): GoogleEvent {
  const g: GoogleEvent = {
    summary: conNino(ev.title, ev.kid),
    location: ev.place ?? undefined,
    description: ev.notes ?? undefined,
    recurrence: rrule(ev.repeat, ev.date),
    extendedProperties: { private: { [PROPIEDAD_APP]: ev.id } },
  }
  if (ev.time) {
    const hhmm = ev.time.slice(0, 5)
    const [h, m] = hhmm.split(':').map(Number)
    const fin =
      h! + 1 >= 24 ? { date: addDays(ev.date, 1), hh: h! + 1 - 24 } : { date: ev.date, hh: h! + 1 }
    g.start = { dateTime: `${ev.date}T${hhmm}:00`, timeZone: ZONA }
    g.end = {
      dateTime: `${fin.date}T${String(fin.hh).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      timeZone: ZONA,
    }
  } else {
    g.start = { date: ev.date }
    g.end = { date: addDays(ev.date, 1) }
  }
  return g
}

/** Algo de Niños con fecha → recurso de Google (no se repite ni tiene lugar). */
export function ninoAGoogle(
  k: Pick<KidItem, 'id' | 'text' | 'kid' | 'date' | 'time' | 'notes'> & { date: string },
): GoogleEvent {
  return eventoAGoogle({
    id: k.id,
    title: k.text,
    kid: k.kid,
    date: k.date,
    time: k.time,
    repeat: null,
    place: null,
    notes: k.notes,
  })
}

const partesCdmx = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "2026-10-13T16:00:00Z" → { date: '2026-10-13', time: '10:00' } en la Ciudad de México. */
export function aHoraLocal(dateTime: string): { date: string; time: string } {
  const p = Object.fromEntries(
    partesCdmx.formatToParts(new Date(dateTime)).map((x) => [x.type, x.value]),
  )
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

export interface FilaGoogle {
  member_id: string
  calendar_id: string
  google_event_id: string
  etag: string | null
  title: string
  date: string
  time: string | null
  html_link: string | null
}

/**
 * Evento de Google → fila de google_events. Devuelve null si hay que borrarlo (cancelado) o
 * ignorarlo (lo publicó la propia app).
 */
export function googleAFila(
  g: GoogleEvent,
  memberId: string,
  calendarId: string,
): FilaGoogle | null {
  if (!g.id || g.status === 'cancelled') return null
  if (g.extendedProperties?.private?.[PROPIEDAD_APP]) return null
  let date: string
  let time: string | null = null
  if (g.start?.date) date = g.start.date
  else if (g.start?.dateTime) ({ date, time } = aHoraLocal(g.start.dateTime))
  else return null
  return {
    member_id: memberId,
    calendar_id: calendarId,
    google_event_id: g.id,
    etag: g.etag ?? null,
    title: (g.summary || '(Sin título)').slice(0, 200),
    date,
    time,
    html_link: g.htmlLink ?? null,
  }
}
