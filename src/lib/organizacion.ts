/* Reglas de Niños, Planes, Notas y Comidas (criterios del prototipo). */
import type { CalendarEvent, Contact, KidKind, Meal, Note, Plan } from '@/types/db'
import { addDays } from './fechas.ts'
import { occDates } from './recurrencia'
import { norm } from './texto'

const porFecha = (a: { date: string | null }, b: { date: string | null }) =>
  (a.date ?? '9') < (b.date ?? '9') ? -1 : (a.date ?? '9') > (b.date ?? '9') ? 1 : 0
const porAlta = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0

/* ---------- Niños ---------- */

export const KID_KIND_NAME: Record<KidKind, string> = {
  cita: 'Cita médica',
  vacuna: 'Vacuna',
  actividad: 'Actividad',
  escuela: 'Escuela',
  fiesta: 'Fiesta o regalo',
  otro: 'Otro',
}

/** Nombres de niños ya usados en Niños y en eventos (para filtros y sugerencias). */
export const kidNames = (items: { kid?: string | null }[]) =>
  [...new Set(items.map((i) => i.kid?.trim()).filter((k): k is string => !!k))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )

export interface EventoNino {
  event: CalendarEvent
  /** Próxima fecha (o la última, si ya pasó). */
  date: string
}

const porFechaHora = (a: EventoNino, b: EventoNino) =>
  a.date.localeCompare(b.date) || (a.event.time ?? '').localeCompare(b.event.time ?? '')

/**
 * Vista Niños: los eventos que tienen niño, filtrados por niño y tipo.
 * Próximos: su siguiente fecha de hoy a un año (los que se repiten, la siguiente vez).
 * Ya pasaron: los que no se repiten de los últimos 60 días, el más reciente primero.
 */
export function kidView(
  events: CalendarEvent[],
  today: string,
  kid: string | null,
  kind: KidKind | null,
) {
  const lista = events.filter(
    (e) => e.kid?.trim() && (!kid || e.kid.trim() === kid) && (!kind || e.kid_kind === kind),
  )
  const proximos: EventoNino[] = []
  const pasados: EventoNino[] = []
  for (const e of lista) {
    const next = occDates(e.date, e.repeat, today, addDays(today, 366))[0]
    if (next) proximos.push({ event: e, date: next })
    else if (!e.repeat && e.date < today && e.date >= addDays(today, -60))
      pasados.push({ event: e, date: e.date })
  }
  return { proximos: proximos.sort(porFechaHora), pasados: pasados.sort(porFechaHora).reverse() }
}

/* ---------- Planes ---------- */

export const PLAN_KIND_NAME: Record<Plan['kind'], string> = {
  restaurante: 'Restaurantes',
  finde: 'Fin de semana',
  pareja: 'Noche de pareja',
  viaje: 'Viajes',
  otro: 'Otros',
}
export const PLAN_STATUS_NAME: Record<Plan['status'], string> = {
  planeado: 'Planeado',
  idea: 'Idea',
  hecho: 'Hecho',
}
const PLAN_ORDER: Plan['status'][] = ['planeado', 'idea', 'hecho']

/** Grupos por estado (Planeado, Idea, Hecho); dentro, por fecha y luego por antigüedad. */
export function planGroups(items: Plan[], kind: Plan['kind'] | null) {
  const list = items.filter((p) => !kind || p.kind === kind)
  return PLAN_ORDER.map((status) => ({
    status,
    name: PLAN_STATUS_NAME[status],
    items: list.filter((p) => p.status === status).sort((a, b) => porFecha(a, b) || porAlta(a, b)),
  })).filter((g) => g.items.length)
}

/** "Sorpréndeme": una idea al azar con estado Idea del filtro actual (sin repetir la anterior si hay más). */
export function surprise(
  items: Plan[],
  kind: Plan['kind'] | null,
  previous: string | null,
  random: () => number = Math.random,
): Plan | null {
  const pool = items.filter((p) => p.status === 'idea' && (!kind || p.kind === kind))
  const candidates = pool.length > 1 ? pool.filter((p) => p.id !== previous) : pool
  if (!candidates.length) return null
  return candidates[Math.floor(random() * candidates.length)] ?? null
}

export const isHttpLink = (l: string | null | undefined): l is string =>
  !!l && /^https:\/\//i.test(l)

/* ---------- Notas y contactos ---------- */

/** Búsqueda sin acentos ni mayúsculas. */
export function searchNotes(items: Note[], q: string): Note[] {
  const k = norm(q).trim()
  return items
    .filter((n) => !k || norm(`${n.title} ${n.body ?? ''}`).includes(k))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
}
export function searchContacts(items: Contact[], q: string): Contact[] {
  const k = norm(q).trim()
  return items
    .filter((c) => !k || norm(`${c.name} ${c.role ?? ''} ${c.phone ?? ''}`).includes(k))
    .sort((a, b) => norm(a.name).localeCompare(norm(b.name)))
}

/* ---------- Comidas ---------- */

/** Comidas con platillo en la semana que empieza en `monday` (de 21). */
export function plannedMeals(meals: Meal[], monday: string): number {
  const end = addDays(monday, 6)
  return meals.filter((m) => m.text && m.date >= monday && m.date <= end).length
}
