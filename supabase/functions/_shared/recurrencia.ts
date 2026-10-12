/*
 * Repeticiones de pendientes y eventos, y próximas ocurrencias de fechas importantes.
 * Fuente única: se copia a supabase/functions/_shared con `pnpm sync:shared`.
 * Debe coincidir con public.complete_task (meses contados desde la fecha ORIGINAL).
 */
import { addDays, addMonths, diff, parse } from './fechas.ts'

export type Repeat =
  'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

export const REPS: Record<Repeat, [number, 'd' | 'm']> = {
  semanal: [7, 'd'],
  quincenal: [14, 'd'],
  mensual: [1, 'm'],
  bimestral: [2, 'm'],
  trimestral: [3, 'm'],
  semestral: [6, 'm'],
  anual: [12, 'm'],
}

export const REPEAT_NAME: Record<Repeat, string> = {
  semanal: 'Cada semana',
  quincenal: 'Cada 2 semanas',
  mensual: 'Cada mes',
  bimestral: 'Cada 2 meses',
  trimestral: 'Cada 3 meses',
  semestral: 'Cada 6 meses',
  anual: 'Cada año',
}

export const REPEATS = Object.keys(REPS) as Repeat[]

const isRepeat = (r: string | null | undefined): r is Repeat => !!r && r in REPS

/** k-ésima ocurrencia contando desde la fecha base (k = 0 es la base). */
export function nth(base: string, repeat: Repeat | null | undefined, k: number): string {
  if (!isRepeat(repeat)) return base
  const [n, unit] = REPS[repeat]
  return unit === 'd' ? addDays(base, n * k) : addMonths(base, n * k)
}

/** Ocurrencias dentro de [from, to] (ambos incluidos). */
export function occDates(
  base: string | null | undefined,
  repeat: Repeat | null | undefined,
  from: string,
  to: string,
): string[] {
  if (!base) return []
  if (!isRepeat(repeat)) return base >= from && base <= to ? [base] : []
  const [n, unit] = REPS[repeat]
  const out: string[] = []
  let k = 0
  if (base < from) {
    // Salta hasta poco antes del rango (estimación por debajo) para no recorrer años enteros.
    k = Math.max(0, Math.floor(diff(from, base) / (unit === 'd' ? n : n * 31)) - 1)
  }
  for (; k < 5000; k++) {
    const d = nth(base, repeat, k)
    if (d > to) break
    if (d >= from) out.push(d)
  }
  return out
}

/** Primera ocurrencia posterior a la base que cae en `today` o después (al completar una rutina). */
export function nextAfter(base: string, repeat: Repeat, today: string): string {
  let k = 1
  let d = nth(base, repeat, k)
  while (d < today && k < 5000) {
    k++
    d = nth(base, repeat, k)
  }
  return d
}

/** Próxima ocurrencia (≥ from) de una fecha importante; si no es anual, la propia fecha. */
export function nextOcc(date: string, yearly: boolean, from: string): string {
  if (!yearly) return date
  const ky = Math.max(0, parse(from).getUTCFullYear() - parse(date).getUTCFullYear())
  let c = nth(date, 'anual', ky)
  if (c < from) c = nth(date, 'anual', ky + 1)
  return c
}
