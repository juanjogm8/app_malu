import { useEscritura, useRows } from '@/app/datos'
import { useToast } from '@/components/Toast'
import { es } from '@/i18n/es'
import { guessCat } from '@/lib/categorias'
import { superDuplicate } from '@/lib/listas'
import type { ShoppingCategory } from '@/types/db'

const t = es.listas

/** Agrega al súper sin duplicar: avisa si ya está o lo reactiva si estaba comprado. */
export function useAgregarAlSuper() {
  const { rows } = useRows('shopping_items')
  const w = useEscritura()
  const toast = useToast()
  return async (
    text: string,
    category?: ShoppingCategory | null,
    silencioso = false,
  ): Promise<'nuevo' | 'ya-esta' | 'volvio' | 'error'> => {
    const dup = superDuplicate(rows, text)
    if (dup.kind === 'ya-esta') {
      if (!silencioso) toast.show(t.yaEsta)
      return 'ya-esta'
    }
    if (dup.kind === 'volvio') {
      if (!(await w.update('shopping_items', dup.item.id, { done: false }))) return 'error'
      if (!silencioso) toast.show(t.volvio)
      return 'volvio'
    }
    const ok = await w.insert('shopping_items', { text, category: category ?? guessCat(text) })
    return ok ? 'nuevo' : 'error'
  }
}
