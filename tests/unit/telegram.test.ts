import type { CalendarData } from '@/lib/calendario'
import {
  avisoPush,
  esPara,
  esc,
  parseCommand,
  parsePendiente,
  resumenDiario,
  resumenSemanal,
  textoHoy,
  textoSuper,
} from '@/lib/telegram'
import type { ShoppingItem } from '@/types/db'

const T = '2026-10-12'
const YO = 'yo'
const MALU = 'malu'
const members = [
  { id: YO, name: 'Juanjo Gamur', email: 'j@x.com' },
  { id: MALU, name: 'Malu Ramírez', email: 'm@x.com' },
]
const a = { created_by: null, created_at: '', updated_at: '' }
const base = {
  assignee_id: null,
  is_shared: false,
  priority: 'media',
  category: 'Casa',
  repeat: null,
  rotate: false,
  notes: null,
  done: false,
  done_on: null,
  last_done_on: null,
  last_done_by: null,
} as const
const data: CalendarData = {
  events: [
    {
      ...a,
      id: 'e1',
      title: 'Junta <escuela>',
      date: T,
      time: '08:30:00',
      repeat: null,
      owner_id: null,
      is_shared: true,
      place: null,
      notes: null,
    },
    {
      ...a,
      id: 'e2',
      title: 'Dentista de Malu',
      date: T,
      time: '10:00:00',
      repeat: null,
      owner_id: MALU,
      is_shared: false,
      place: null,
      notes: null,
    },
  ],
  tasks: [
    {
      ...a,
      ...base,
      id: 't1',
      text: 'Colegiatura',
      assignee_id: YO,
      due_date: T,
      repeat: 'mensual',
    },
    { ...a, ...base, id: 't2', text: 'Foco', assignee_id: MALU, due_date: '2026-10-08' },
    { ...a, ...base, id: 't3', text: 'Basura', due_date: '2026-10-10' },
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
  plans: [],
  meals: [{ ...a, id: 'm1', date: T, meal: 'comida', text: 'Pozole', ingredients: null }],
}

describe('comandos', () => {
  it('parsea comandos con y sin nombre del bot', () => {
    expect(parseCommand('/agregar@CasaBot leche entera')).toEqual({
      cmd: 'agregar',
      args: 'leche entera',
    })
    expect(parseCommand('/HOY')).toEqual({ cmd: 'hoy', args: '' })
    expect(parseCommand('hola')).toBe(null)
  })
  it('pendiente con fecha opcional', () => {
    expect(parsePendiente('pagar predial 15/11', T)).toEqual({
      text: 'pagar predial',
      due: '2026-11-15',
    })
    expect(parsePendiente('renovar pasaporte 5/3', T)).toEqual({
      text: 'renovar pasaporte',
      due: '2027-03-05',
    })
    expect(parsePendiente('algo 1/2/2028', T)).toEqual({ text: 'algo', due: '2028-02-01' })
    expect(parsePendiente('sacar la basura', T)).toEqual({ text: 'sacar la basura', due: null })
    expect(parsePendiente('fecha mala 31/02', T)).toEqual({ text: 'fecha mala 31/02', due: null })
    expect(parsePendiente('', T)).toBe(null)
  })
})

describe('resúmenes', () => {
  const ctx = { data, members, today: T }
  it('lo de una persona llega solo a esa persona; Ambos y sin asignar, a las dos', () => {
    expect(esPara(MALU, false, YO)).toBe(false)
    expect(esPara(null, false, YO)).toBe(true)
    expect(esPara(MALU, true, YO)).toBe(true)
    const mio = textoHoy(ctx, YO)!
    expect(mio).toContain('Junta &lt;escuela&gt;')
    expect(mio).not.toContain('Dentista de Malu')
    expect(mio).not.toContain('Foco')
    expect(mio).toContain('Basura')
    expect(mio).toContain('Colegiatura')
    expect(mio).toContain('(tú, cada mes)')
    expect(mio).toContain('Cumpleaños de Mamá')
    expect(mio).toContain('cumple 64')
    expect(mio).toContain('Comida: <b>Pozole</b>')
    const suyo = textoHoy(ctx, MALU)!
    expect(suyo).toContain('Dentista de Malu')
    expect(suyo).toContain('Foco')
    expect(suyo).not.toContain('Colegiatura') // es de Juanjo
  })
  it('el diario saluda con el primer nombre; sin nada que contar, no hay mensaje', () => {
    expect(resumenDiario(ctx, members[0]!)).toMatch(
      /^<b>Buenos días, Juanjo<\/b> · Lunes 12 de octubre/,
    )
    const vacio = {
      data: { ...data, events: [], tasks: [], dates: [], meals: [] },
      members,
      today: T,
    }
    expect(resumenDiario(vacio, members[0]!)).toBe(null)
  })
  it('el semanal invita a la revisión', () => {
    const r = resumenSemanal(
      { ...ctx, data: { ...data, events: [{ ...data.events[0]!, date: '2026-10-14' }] } },
      members[0]!,
      'https://casa.vercel.app/',
    )
    expect(r).toContain('Miércoles 14')
    expect(r).toContain('https://casa.vercel.app/revision')
  })
  it('súper por sección y escapado', () => {
    const it_ = (text: string, category: ShoppingItem['category'], done = false): ShoppingItem => ({
      ...a,
      id: text,
      text,
      category,
      done,
    })
    const txt = textoSuper([
      it_('Leche', 'lacteos'),
      it_('Jitomate', 'frutas'),
      it_('Pan <dulce>', 'pan', true),
    ])
    expect(txt.indexOf('Frutas y verduras')).toBeLessThan(txt.indexOf('Lácteos y huevo'))
    expect(txt).toContain('faltan 2')
    expect(txt).not.toContain('dulce')
    expect(esc('<b>&')).toBe('&lt;b&gt;&amp;')
  })
})

describe('aviso push', () => {
  it('título y hasta 4 líneas en texto plano', () => {
    const html =
      '<b>Buenos días, Juanjo</b> · Lunes\n\n<b>Hoy</b>\n• <b>A &amp; B</b>\n• b\n• c\n• d\n• e'
    expect(avisoPush(html)).toEqual({
      title: 'Buenos días, Juanjo · Lunes',
      body: '• A & B\n• b\n• c\n• d\n…y 1 más',
    })
  })
})
