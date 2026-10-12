// ⚠ Copia generada por `pnpm sync:shared`. Edita el original en src/.
/*
 * Fechas de calendario como texto "AAAA-MM-DD", sin zona horaria implícita.
 * La aritmética se hace en UTC para que el horario del dispositivo no mueva los días.
 * Archivo puro y compartido con las Edge Functions (`pnpm sync:shared`): solo puede importar
 * otros archivos de `src/lib` compartidos, con extensión .ts.
 */

export const ZONA = 'America/Mexico_City'

const pad = (n: number) => String(n).padStart(2, '0')

/** Date (en UTC a medianoche) → "AAAA-MM-DD". */
export function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** "AAAA-MM-DD" → Date a medianoche UTC. */
export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!))
}

const hoyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Hoy en la Ciudad de México. */
export function today(now: Date = new Date()): string {
  return hoyFmt.format(now)
}

export function addDays(s: string, n: number): string {
  const d = parse(s)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

/** Suma meses; si el día no existe en el mes destino, usa el último (31 ene + 1 → 28/29 feb). */
export function addMonths(s: string, n: number): string {
  const d = parse(s)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, dim))
  return iso(d)
}

/** Días de b a a (a − b). */
export function diff(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 864e5)
}

/** Día de la semana con lunes = 0. */
export function dow(s: string): number {
  return (parse(s).getUTCDay() + 6) % 7
}

export function startOfWeek(s: string): string {
  return addDays(s, -dow(s))
}

export function startOfMonth(s: string): string {
  return s.slice(0, 8) + '01'
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const fmt = (o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', ...o })
const F = {
  weekday: fmt({ weekday: 'long' }),
  weekdayShort: fmt({ weekday: 'short' }),
  month: fmt({ month: 'long' }),
  monthShort: fmt({ month: 'short' }),
}
const sinPunto = (s: string) => s.replace('.', '')

/** "Lunes 12 de octubre" */
export function fLong(s: string): string {
  const d = parse(s)
  return `${cap(F.weekday.format(d))} ${d.getUTCDate()} de ${F.month.format(d)}`
}

/** "Martes 13" */
export function fDay(s: string): string {
  const d = parse(s)
  return `${cap(F.weekday.format(d))} ${d.getUTCDate()}`
}

/** "12 oct" */
export function fShort(s: string): string {
  const d = parse(s)
  return `${d.getUTCDate()} ${sinPunto(F.monthShort.format(d))}`
}

/** "Sáb 17 oct" */
export function fWdShort(s: string): string {
  const d = parse(s)
  return `${cap(sinPunto(F.weekdayShort.format(d)))} ${fShort(s)}`
}

/** "Lun" */
export function fWd3(s: string): string {
  return cap(sinPunto(F.weekdayShort.format(parse(s)))).slice(0, 3)
}

/** "Octubre" */
export function fMonth(s: string): string {
  return cap(F.month.format(parse(s)))
}

/** "12 – 18 oct" o "28 sep – 4 oct" */
export function fRange(from: string, to: string): string {
  const a = parse(from)
  const b = parse(to)
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()} – ${fShort(to)}`
  return `${fShort(from)} – ${fShort(to)}`
}

/** "8:30" a partir de "08:30:00" (Postgres) o "08:30". */
export function fTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${Number(h)}:${m}`
}
