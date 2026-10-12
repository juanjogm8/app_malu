import { DEFAULT_LAYERS, entriesInRange } from '@/lib/calendario'
import type { CalendarData } from '@/lib/calendario'
import { ageAt, dateInfos, isApproaching, whenLabel } from '@/lib/fechas-importantes'
import type { ImportantDate } from '@/types/db'

const a = { created_by: null, created_at: '', updated_at: '' }
const data: CalendarData = {
  events: [
    {
      ...a,
      id: 'e1',
      title: 'Natación',
      date: '2026-10-05',
      time: '17:00:00',
      repeat: 'semanal',
      owner_id: 'p1',
      is_shared: false,
      place: null,
      notes: null,
      kid: 'Emilia',
      kid_kind: 'actividad',
    },
    {
      ...a,
      id: 'e2',
      title: 'Junta',
      date: '2026-10-12',
      time: '08:30:00',
      repeat: null,
      owner_id: null,
      is_shared: true,
      place: null,
      notes: null,
    },
  ],
  tasks: [
    {
      ...a,
      id: 't1',
      text: 'Colegiatura',
      assignee_id: 'p2',
      is_shared: false,
      due_date: '2026-10-12',
      priority: 'media',
      category: 'Pagos',
      repeat: 'mensual',
      rotate: false,
      notes: null,
      done: false,
      done_on: null,
      last_done_on: null,
      last_done_by: null,
    },
    {
      ...a,
      id: 't2',
      text: 'Hecha',
      assignee_id: null,
      is_shared: false,
      due_date: '2026-10-12',
      priority: 'media',
      category: 'Casa',
      repeat: null,
      rotate: false,
      notes: null,
      done: true,
      done_on: null,
      last_done_on: null,
      last_done_by: null,
    },
  ],
  dates: [
    {
      ...a,
      id: 'f1',
      name: 'Mamá',
      kind: 'cumple',
      date: '1962-10-17',
      yearly: true,
      remind_days: 7,
      notes: null,
    },
  ],
  plans: [
    {
      ...a,
      id: 'p1',
      text: 'Cena',
      kind: 'restaurante',
      status: 'planeado',
      date: '2026-10-12',
      place: null,
      link: null,
      notes: null,
    },
  ],
  meals: [{ ...a, id: 'm1', date: '2026-10-13', meal: 'comida', text: 'Tacos', ingredients: null }],
}

describe('entriesInRange', () => {
  it('une capas y ordena: sin hora, luego hora, luego título', () => {
    const map = entriesInRange(data, '2026-10-12', '2026-10-18', DEFAULT_LAYERS)
    expect(map.get('2026-10-12')!.map((e) => `${e.time}|${e.title}`)).toEqual([
      '|Cena',
      '|Colegiatura',
      '08:30|Junta',
      '17:00|Natación',
    ])
    expect(map.get('2026-10-17')!.map((e) => e.title)).toEqual(['Cumpleaños de Mamá'])
    expect(map.get('2026-10-12')!.find((e) => e.title === 'Natación')!.extra).toBe('Emilia')
    expect(map.has('2026-10-13')).toBe(false) // comidas apagadas por defecto
  })

  it('respeta capas inactivas y activas', () => {
    const map = entriesInRange(data, '2026-10-12', '2026-10-18', {
      ...DEFAULT_LAYERS,
      evento: false,
      comida: true,
    })
    expect(map.get('2026-10-12')!.map((e) => e.kind)).toEqual(['plan', 'pendiente'])
    expect(map.get('2026-10-13')![0]!.title).toBe('Comida: Tacos')
  })
})

describe('fechas importantes', () => {
  const d = (o: Partial<ImportantDate>): ImportantDate => ({
    ...a,
    id: 'x',
    name: 'Mamá',
    kind: 'cumple',
    date: '1962-10-17',
    yearly: true,
    remind_days: 7,
    notes: null,
    ...o,
  })
  it('se acerca entre 0 y remind_days; edad solo si tiene sentido', () => {
    const [x] = dateInfos([d({})], '2026-10-12')
    expect(x!.days).toBe(5)
    expect(isApproaching(x!)).toBe(true)
    expect(ageAt(x!)).toBe(64)
    const [y] = dateInfos([d({ date: '2026-10-30' })], '2026-10-12')
    expect(isApproaching(y!)).toBe(false)
    expect(ageAt(y!)).toBe(null)
  })
  it('etiquetas de cuándo', () => {
    expect([whenLabel(0), whenLabel(1), whenLabel(-1), whenLabel(-3), whenLabel(5)]).toEqual([
      'Hoy',
      'Mañana',
      'Hace 1 día',
      'Hace 3 días',
      'En 5 días',
    ])
  })
})
