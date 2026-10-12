import { improvementGroups, purchaseGroups, superDuplicate, superSections } from '@/lib/listas'
import { mealIngredients, splitIng } from '@/lib/ingredientes'
import type { HomeImprovement, Purchase, ShoppingItem } from '@/types/db'

const audit = (n: number) => ({
  id: `id${n}`,
  created_by: null,
  created_at: `2026-10-0${n}T00:00:00Z`,
  updated_at: '',
})
const item = (n: number, text: string, o: Partial<ShoppingItem> = {}): ShoppingItem => ({
  ...audit(n),
  text,
  category: 'otros',
  done: false,
  ...o,
})

describe('súper', () => {
  it('duplicado sin comprar: "Ya está en la lista"', () => {
    const r = superDuplicate([item(1, 'Limón')], ' limon ')
    expect(r.kind).toBe('ya-esta')
  })
  it('duplicado comprado: se reactiva', () => {
    const r = superDuplicate([item(1, 'Leche', { done: true })], 'LECHE')
    expect(r.kind).toBe('volvio')
  })
  it('nuevo', () => {
    expect(superDuplicate([item(1, 'Leche')], 'Huevo').kind).toBe('nuevo')
  })
  it('secciones en orden del catálogo, sin comprar primero, y ocultar comprados', () => {
    const items = [
      item(1, 'Fabuloso', { category: 'limpieza', done: true }),
      item(2, 'Cloro', { category: 'limpieza' }),
      item(3, 'Leche', { category: 'lacteos' }),
    ]
    const s = superSections(items, false)
    expect(s.map((x) => x.cat)).toEqual(['lacteos', 'limpieza'])
    expect(s[1]!.items.map((i) => i.text)).toEqual(['Cloro', 'Fabuloso'])
    expect(s[1]!.left).toBe(1)
    expect(superSections(items, true)[1]!.items.map((i) => i.text)).toEqual(['Cloro'])
  })
})

describe('compras', () => {
  const p = (n: number, priority: Purchase['priority'], o: Partial<Purchase> = {}): Purchase => ({
    ...audit(n),
    text: `c${n}`,
    price: null,
    store: null,
    priority,
    done: false,
    ...o,
  })
  it('por prioridad y antigüedad, con total de pendientes', () => {
    const g = purchaseGroups([
      p(1, 'media', { price: 100 }),
      p(2, 'alta', { price: 50.5 }),
      p(3, 'alta'),
      p(4, 'baja', { done: true, price: 999 }),
    ])
    expect(g.pending.map((x) => x.id)).toEqual(['id2', 'id3', 'id1'])
    expect(g.done.map((x) => x.id)).toEqual(['id4'])
    expect(g.total).toBe(150.5)
  })
})

describe('mejoras', () => {
  const m = (
    n: number,
    status: HomeImprovement['status'],
    area: HomeImprovement['area'],
    price: number | null,
  ): HomeImprovement => ({ ...audit(n), text: `m${n}`, status, area, price })
  it('grupos por estado en orden y resumen; filtro por área', () => {
    const items = [
      m(1, 'idea', 'Cocina', 1000),
      m(2, 'listo', 'Cocina', 500),
      m(3, 'proceso', 'Baño', 200),
    ]
    const g = improvementGroups(items, null)
    expect(g.groups.map((x) => x.status)).toEqual(['proceso', 'idea', 'listo'])
    expect([g.open, g.estimate, g.done]).toEqual([2, 1200, 1])
    const c = improvementGroups(items, 'Cocina')
    expect([c.open, c.estimate, c.done]).toEqual([1, 1000, 1])
  })
})

describe('ingredientes', () => {
  it('separa por coma y salto de línea', () => {
    expect(splitIng('Jitomate, cebolla\n ajo ,,')).toEqual(['Jitomate', 'cebolla', 'ajo'])
  })
  it('quita duplicados sin importar acentos ni mayúsculas, solo en la semana', () => {
    const meals = [
      { date: '2026-10-12', ingredients: 'Limón, Cebolla' },
      { date: '2026-10-13', ingredients: 'limon\nAjo' },
      { date: '2026-10-25', ingredients: 'Pollo' },
    ]
    expect(mealIngredients(meals, '2026-10-12', '2026-10-18')).toEqual(['Limón', 'Cebolla', 'Ajo'])
  })
})
