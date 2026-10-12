// ⚠ Copia generada por `pnpm sync:shared`. Edita el original en src/.
/* Une todas las capas del calendario en un mapa fecha → entradas (entriesInRange del prototipo). */
import type { CalendarEvent, ImportantDate, KidItem, Meal, Plan, Task } from './db.ts'
import { dateTitle } from './fechas-importantes.ts'
import { occDates } from './recurrencia.ts'

export type EntryKind = 'evento' | 'pendiente' | 'fecha' | 'ninos' | 'plan' | 'comida'

export const KIND_LABEL: Record<EntryKind, string> = {
  evento: 'Evento',
  pendiente: 'Pendiente',
  fecha: 'Fecha',
  ninos: 'Niños',
  plan: 'Plan',
  comida: 'Comida',
}

export type Layers = Record<EntryKind, boolean>
export const DEFAULT_LAYERS: Layers = {
  evento: true,
  pendiente: true,
  fecha: true,
  ninos: true,
  plan: true,
  comida: false,
}
/** Capas de Inicio y Revisión: todas menos comidas. */
export const ALL_BUT_MEALS: Layers = { ...DEFAULT_LAYERS }

export interface Entry {
  key: string
  kind: EntryKind
  id: string
  date: string
  title: string
  /** "HH:MM" o '' si es de todo el día */
  time: string
  /** Responsable: una persona, "Ambos" (shared) o nadie */
  personId: string | null
  shared: boolean
  /** Texto extra para el subtítulo ("Cada mes", "Emilia") */
  extra?: string
  repeat?: Task['repeat']
}

export interface CalendarData {
  events: CalendarEvent[]
  tasks: Task[]
  dates: ImportantDate[]
  kids: KidItem[]
  plans: Plan[]
  meals: Meal[]
}

const MEAL_NAME = { desayuno: 'Desayuno', comida: 'Comida', cena: 'Cena' } as const
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

export function entriesInRange(
  data: CalendarData,
  from: string,
  to: string,
  layers: Layers,
): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>()
  const push = (e: Entry) => {
    const list = map.get(e.date)
    if (list) list.push(e)
    else map.set(e.date, [e])
  }
  const inRange = (d: string | null): d is string => !!d && d >= from && d <= to

  if (layers.evento)
    for (const ev of data.events)
      for (const d of occDates(ev.date, ev.repeat, from, to))
        push({
          key: `evento:${ev.id}:${d}`,
          kind: 'evento',
          id: ev.id,
          date: d,
          title: ev.title,
          time: hhmm(ev.time),
          personId: ev.owner_id,
          shared: ev.is_shared,
          repeat: ev.repeat,
        })

  if (layers.pendiente)
    for (const t of data.tasks)
      if ((!t.done || t.repeat) && inRange(t.due_date))
        push({
          key: `pendiente:${t.id}`,
          kind: 'pendiente',
          id: t.id,
          date: t.due_date,
          title: t.text,
          time: '',
          personId: t.assignee_id,
          shared: t.is_shared,
          repeat: t.repeat,
        })

  if (layers.fecha)
    for (const f of data.dates)
      for (const d of occDates(f.date, f.yearly ? 'anual' : null, from, to))
        push({
          key: `fecha:${f.id}:${d}`,
          kind: 'fecha',
          id: f.id,
          date: d,
          title: dateTitle(f),
          time: '',
          personId: null,
          shared: true,
        })

  if (layers.ninos)
    for (const k of data.kids)
      if (!k.done && inRange(k.date))
        push({
          key: `ninos:${k.id}`,
          kind: 'ninos',
          id: k.id,
          date: k.date,
          title: k.text,
          time: hhmm(k.time),
          personId: null,
          shared: true,
          extra: k.kid ?? undefined,
        })

  if (layers.plan)
    for (const p of data.plans)
      if (p.status !== 'hecho' && inRange(p.date))
        push({
          key: `plan:${p.id}`,
          kind: 'plan',
          id: p.id,
          date: p.date,
          title: p.text,
          time: '',
          personId: null,
          shared: true,
        })

  if (layers.comida)
    for (const m of data.meals)
      if (m.text && inRange(m.date))
        push({
          key: `comida:${m.id}`,
          kind: 'comida',
          id: m.id,
          date: m.date,
          title: `${MEAL_NAME[m.meal]}: ${m.text}`,
          time: '',
          personId: null,
          shared: true,
        })

  // Sin hora primero, luego por hora y luego por título.
  for (const list of map.values())
    list.sort(
      (a, b) =>
        Number(!!a.time) - Number(!!b.time) ||
        a.time.localeCompare(b.time) ||
        a.title.localeCompare(b.title, 'es'),
    )
  return map
}
