import type { Meal } from '@/types/db'
import { norm } from './texto'

/** Separa ingredientes por coma o salto de línea. */
export function splitIng(s: string | null | undefined): string[] {
  return String(s ?? '')
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Ingredientes de las comidas entre `from` y `to`, sin duplicados (sin acentos ni mayúsculas). */
export function mealIngredients(
  meals: Pick<Meal, 'date' | 'ingredients'>[],
  from: string,
  to: string,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of meals) {
    if (!m.ingredients || m.date < from || m.date > to) continue
    for (const n of splitIng(m.ingredients)) {
      const k = norm(n)
      if (!seen.has(k)) {
        seen.add(k)
        out.push(n)
      }
    }
  }
  return out
}
