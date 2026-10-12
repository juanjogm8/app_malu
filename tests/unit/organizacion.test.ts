import { dateGroups, whenLabel } from '@/lib/fechas-importantes'
import {
  isHttpLink,
  kidGroups,
  kidNames,
  planGroups,
  plannedMeals,
  searchContacts,
  searchNotes,
  surprise,
} from '@/lib/organizacion'
import type { Contact, ImportantDate, KidItem, Meal, Note, Plan } from '@/types/db'

const T = '2026-10-12'
let n = 0
const a = () => ({
  id: `x${++n}`,
  created_by: null,
  created_at: `2026-10-01T00:00:${String(n).padStart(2, '0')}Z`,
  updated_at: `2026-10-0${(n % 9) + 1}`,
})

describe('niños', () => {
  const k = (o: Partial<KidItem>): KidItem => ({
    ...a(),
    text: 'k',
    kind: 'cita',
    kid: null,
    date: null,
    time: null,
    notes: null,
    done: false,
    ...o,
  })
  const items = [
    k({ text: 'atrasado', date: '2026-10-10', kid: 'Santi', kind: 'escuela' }),
    k({ text: 'próximo 2', date: '2026-10-22', kid: 'Emilia' }),
    k({ text: 'próximo 1', date: T, kid: 'Emilia', kind: 'vacuna' }),
    k({ text: 'sin fecha', kid: 'Santi' }),
    k({ text: 'hecho', date: '2026-10-01', done: true, kid: 'Emilia' }),
  ]
  it('agrupa y ordena', () => {
    const g = kidGroups(items, T, null, null)
    expect(g.map((x) => [x.name, x.items.map((i) => i.text)])).toEqual([
      ['Atrasados', ['atrasado']],
      ['Próximos', ['próximo 1', 'próximo 2']],
      ['Sin fecha', ['sin fecha']],
      ['Hechos', ['hecho']],
    ])
  })
  it('filtra por tipo y por niño', () => {
    expect(kidGroups(items, T, 'vacuna', null).flatMap((g) => g.items.map((i) => i.text))).toEqual([
      'próximo 1',
    ])
    expect(kidGroups(items, T, null, 'Santi').flatMap((g) => g.items.map((i) => i.text))).toEqual([
      'atrasado',
      'sin fecha',
    ])
    expect(kidNames(items)).toEqual(['Emilia', 'Santi'])
  })
})

describe('planes', () => {
  const p = (o: Partial<Plan>): Plan => ({
    ...a(),
    text: 'p',
    kind: 'restaurante',
    status: 'idea',
    date: null,
    place: null,
    link: null,
    notes: null,
    ...o,
  })
  const items = [
    p({ text: 'idea 1' }),
    p({ text: 'hecho', status: 'hecho' }),
    p({ text: 'planeado', status: 'planeado', date: '2026-11-07', kind: 'pareja' }),
    p({ text: 'idea viaje', kind: 'viaje' }),
  ]
  it('grupos Planeado, Idea, Hecho y filtro por tipo', () => {
    expect(planGroups(items, null).map((g) => g.status)).toEqual(['planeado', 'idea', 'hecho'])
    expect(planGroups(items, 'viaje').map((g) => g.items.map((i) => i.text))).toEqual([
      ['idea viaje'],
    ])
  })
  it('sorpréndeme elige solo ideas del filtro y no repite la anterior', () => {
    expect(surprise(items, 'restaurante', null, () => 0)!.text).toBe('idea 1')
    const ids = items.filter((i) => i.status === 'idea').map((i) => i.id)
    expect(surprise(items, null, ids[0]!, () => 0)!.id).toBe(ids[1])
    expect(surprise(items, 'pareja', null)).toBe(null)
  })
  it('solo los enlaces https se abren', () => {
    expect(isHttpLink('https://x.com')).toBe(true)
    expect(isHttpLink('javascript:alert(1)')).toBe(false)
    expect(isHttpLink('x.com')).toBe(false)
  })
})

describe('notas y contactos', () => {
  it('busca sin acentos', () => {
    const notes: Note[] = [
      { ...a(), title: 'Clave del wifi', body: 'Módem atrás de la tele' },
      { ...a(), title: 'Tallas', body: null },
    ]
    expect(searchNotes(notes, 'modem').map((x) => x.title)).toEqual(['Clave del wifi'])
    const contacts: Contact[] = [
      { ...a(), name: 'Dra. Ramírez', role: 'Pediatra', phone: '55 8765', notes: null },
      { ...a(), name: 'Don Pedro', role: 'Plomero', phone: '55 1234', notes: null },
    ]
    expect(searchContacts(contacts, 'ramirez').map((x) => x.name)).toEqual(['Dra. Ramírez'])
    expect(searchContacts(contacts, '').map((x) => x.name)).toEqual(['Don Pedro', 'Dra. Ramírez'])
  })
})

describe('fechas y comidas', () => {
  const d = (o: Partial<ImportantDate>): ImportantDate => ({
    ...a(),
    name: 'x',
    kind: 'vence',
    date: T,
    yearly: false,
    remind_days: 30,
    notes: null,
    ...o,
  })
  it('grupos de fechas', () => {
    const g = dateGroups(
      [
        d({ date: '2026-09-30' }),
        d({ date: '2026-10-17' }),
        d({ date: '2027-01-14', kind: 'cumple', yearly: true }),
      ],
      T,
    )
    expect(g.map((x) => [x.name, x.items.length])).toEqual([
      ['Vencidas', 1],
      ['Próximos 30 días', 1],
      ['Más adelante', 1],
    ])
  })
  it('cuándo, en meses si falta mucho', () => {
    expect(whenLabel(94)).toBe('En 3 meses')
    expect(whenLabel(40)).toBe('En 40 días')
  })
  it('comidas planeadas de la semana', () => {
    const m = (date: string, text: string | null): Meal => ({
      ...a(),
      date,
      meal: 'comida',
      text,
      ingredients: null,
    })
    expect(
      plannedMeals(
        [
          m('2026-10-12', 'Pozole'),
          m('2026-10-18', 'Pizza'),
          m('2026-10-19', 'X'),
          m('2026-10-13', null),
        ],
        '2026-10-12',
      ),
    ).toBe(2)
  })
})
