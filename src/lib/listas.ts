/* Reglas de Súper, Compras y Mejoras (criterios del prototipo). */
import type { HomeImprovement, Purchase, ShoppingItem } from '@/types/db'
import { CATS } from './categorias'
import { norm } from './texto'

export const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 } as const

const byCreated = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0

/** Qué pasa al agregar un producto que ya existe. */
export type SuperDup =
  | { kind: 'nuevo' }
  | { kind: 'ya-esta'; item: ShoppingItem } // está sin comprar → "Ya está en la lista"
  | { kind: 'volvio'; item: ShoppingItem } // estaba comprado → se reactiva ("Volvió a la lista")

export function superDuplicate(items: ShoppingItem[], text: string): SuperDup {
  const key = norm(text).trim()
  const dup = items.find((i) => norm(i.text).trim() === key)
  if (!dup) return { kind: 'nuevo' }
  return dup.done ? { kind: 'volvio', item: dup } : { kind: 'ya-esta', item: dup }
}

export interface SuperSection {
  cat: ShoppingItem['category']
  name: string
  items: ShoppingItem[]
  left: number
}

/** Secciones en el orden del catálogo; sin comprar primero, comprados al final. */
export function superSections(items: ShoppingItem[], hideDone: boolean): SuperSection[] {
  const out: SuperSection[] = []
  for (const [cat, name] of CATS) {
    const all = items.filter((i) => i.category === cat)
    const rows = all
      .filter((i) => !(hideDone && i.done))
      .sort((a, b) => Number(a.done) - Number(b.done) || byCreated(a, b))
    if (rows.length) out.push({ cat, name, items: rows, left: all.filter((i) => !i.done).length })
  }
  return out
}

/** "Por comprar" por prioridad y antigüedad; "Comprado" por antigüedad. */
export function purchaseGroups(items: Purchase[]) {
  const pending = items
    .filter((i) => !i.done)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byCreated(a, b))
  const done = items.filter((i) => i.done).sort(byCreated)
  const total = pending.reduce((t, i) => t + (i.price ?? 0), 0)
  return { pending, done, total }
}

export const STATUS_ORDER: HomeImprovement['status'][] = ['proceso', 'planeado', 'idea', 'listo']
export const STATUS_NAME: Record<HomeImprovement['status'], string> = {
  proceso: 'En proceso',
  planeado: 'Planeado',
  idea: 'Idea',
  listo: 'Listo',
}
export const AREAS: HomeImprovement['area'][] = [
  'Cocina',
  'Baño',
  'Recámaras',
  'Sala y comedor',
  'Terraza o jardín',
  'Cochera',
  'Toda la casa',
]

/** Mejoras agrupadas por estado (En proceso, Planeado, Idea, Listo) y el resumen superior. */
export function improvementGroups(items: HomeImprovement[], area: HomeImprovement['area'] | null) {
  const list = area ? items.filter((i) => i.area === area) : items
  const groups = STATUS_ORDER.map((status) => ({
    status,
    name: STATUS_NAME[status],
    items: list.filter((i) => i.status === status).sort(byCreated),
  })).filter((g) => g.items.length)
  const open = list.filter((i) => i.status !== 'listo')
  return {
    groups,
    open: open.length,
    estimate: open.reduce((t, i) => t + (i.price ?? 0), 0),
    done: list.length - open.length,
  }
}
