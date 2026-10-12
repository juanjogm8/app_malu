import type { ImportantDate } from '@/types/db'
import { diff } from './fechas.ts'
import { nextOcc } from './recurrencia.ts'

export const KIND_NAME: Record<ImportantDate['kind'], string> = {
  cumple: 'Cumpleaños',
  aniversario: 'Aniversario',
  vence: 'Vencimiento',
  otro: 'Otra fecha',
}

export function dateTitle(d: Pick<ImportantDate, 'kind' | 'name'>): string {
  if (d.kind === 'cumple') return `Cumpleaños de ${d.name}`
  if (d.kind === 'aniversario') return `Aniversario: ${d.name}`
  if (d.kind === 'vence') return `Vence: ${d.name}`
  return d.name
}

/** Días de aviso por tipo al cambiarlo en el formulario. */
export const defaultRemind = (kind: ImportantDate['kind']) => (kind === 'vence' ? 30 : 7)
/** Cumpleaños y aniversario se repiten cada año; vencimiento no. */
export const defaultYearly = (kind: ImportantDate['kind']) =>
  kind === 'cumple' || kind === 'aniversario'

export interface DateInfo {
  item: ImportantDate
  next: string
  days: number
}

/** Fechas con su próxima ocurrencia, ordenadas. */
/** Vencidas (no anuales en el pasado), Próximos 30 días y Más adelante. */
export function dateGroups(items: ImportantDate[], today: string) {
  const infos = dateInfos(items, today)
  return [
    { name: 'Vencidas' as const, items: infos.filter((x) => x.days < 0) },
    { name: 'Próximos 30 días' as const, items: infos.filter((x) => x.days >= 0 && x.days <= 30) },
    { name: 'Más adelante' as const, items: infos.filter((x) => x.days > 30) },
  ].filter((g) => g.items.length)
}

export function dateInfos(items: ImportantDate[], today: string): DateInfo[] {
  return items
    .map((item) => {
      const next = nextOcc(item.date, item.yearly, today)
      return { item, next, days: diff(next, today) }
    })
    .sort((a, b) => (a.next < b.next ? -1 : a.next > b.next ? 1 : 0))
}

/** "Se acerca": faltan entre 0 y remind_days días. */
export const isApproaching = (x: DateInfo) => x.days >= 0 && x.days <= x.item.remind_days

/** "Cumple N" solo si el año guardado es menor que el de la próxima ocurrencia y N < 120. */
export function ageAt(x: DateInfo): number | null {
  if (x.item.kind !== 'cumple' || !x.item.yearly) return null
  const age = Number(x.next.slice(0, 4)) - Number(x.item.date.slice(0, 4))
  return age > 0 && age < 120 ? age : null
}

export function whenLabel(days: number): string {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  if (days < 0) return `Hace ${-days} ${days === -1 ? 'día' : 'días'}`
  if (days > 45) {
    const meses = Math.round(days / 30)
    return `En ${meses} ${meses === 1 ? 'mes' : 'meses'}`
  }
  return `En ${days} días`
}
