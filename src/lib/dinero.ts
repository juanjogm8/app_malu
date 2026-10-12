const MXN0 = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})
const MXN2 = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** $1,250 o $1,250.50 */
export function money(n: number): string {
  return Number.isInteger(n) ? MXN0.format(n) : MXN2.format(n)
}

/** "1,250.5" o "$ 1250" → 1250.5; vacío, cero o inválido → null. */
export function parsePrice(v: unknown): number | null {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}
