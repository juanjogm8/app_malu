/* Reglas de Niños, Planes, Notas y Comidas (criterios del prototipo). */
import type { Contact, KidItem, Meal, Note, Plan } from '@/types/db'
import { addDays } from './fechas.ts'
import { norm } from './texto'

const porFecha = (a: { date: string | null }, b: { date: string | null }) =>
  (a.date ?? '9') < (b.date ?? '9') ? -1 : (a.date ?? '9') > (b.date ?? '9') ? 1 : 0
const porAlta = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0

/* ---------- Niños ---------- */

export const KID_KIND_NAME: Record<KidItem['kind'], string> = {
  cita: 'Cita médica',
  vacuna: 'Vacuna',
  actividad: 'Actividad',
  escuela: 'Escuela',
  fiesta: 'Fiesta o regalo',
  otro: 'Otro',
}

/** Nombres de niños ya usados (para filtros y sugerencias). */
export const kidNames = (items: KidItem[]) =>
  [...new Set(items.map((i) => i.kid).filter((k): k is string => !!k))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )

/** Atrasados (con fecha pasada y sin hacer), Próximos, Sin fecha y Hechos. */
export function kidGroups(
  items: KidItem[],
  today: string,
  kind: KidItem['kind'] | null,
  kid: string | null,
) {
  const list = items.filter((i) => (!kind || i.kind === kind) && (!kid || i.kid === kid))
  return [
    {
      name: 'Atrasados' as const,
      items: list.filter((i) => !i.done && i.date && i.date < today).sort(porFecha),
    },
    {
      name: 'Próximos' as const,
      items: list.filter((i) => !i.done && i.date && i.date >= today).sort(porFecha),
    },
    { name: 'Sin fecha' as const, items: list.filter((i) => !i.done && !i.date).sort(porAlta) },
    { name: 'Hechos' as const, items: list.filter((i) => i.done).sort(porFecha) },
  ].filter((g) => g.items.length)
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
