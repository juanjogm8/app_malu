import { filterTasks, groupTasks, overdueTasks, tasksBadge } from '@/lib/pendientes'
import type { Task } from '@/types/db'

const T = '2026-10-12'
let n = 0
const task = (o: Partial<Task>): Task => ({
  id: `t${++n}`,
  created_by: null,
  created_at: '',
  updated_at: '',
  text: 'x',
  assignee_id: null,
  is_shared: false,
  due_date: null,
  priority: 'media',
  category: 'Casa',
  repeat: null,
  rotate: false,
  notes: null,
  done: false,
  done_on: null,
  last_done_on: null,
  last_done_by: null,
  ...o,
})

describe('pendientes', () => {
  const tasks = [
    task({ text: 'atrasada', due_date: '2026-10-08' }),
    task({ text: 'rutina atrasada', due_date: '2026-10-01', repeat: 'mensual' }),
    task({ text: 'hoy', due_date: T }),
    task({ text: 'semana baja', due_date: '2026-10-15', priority: 'baja' }),
    task({ text: 'semana alta', due_date: '2026-10-15', priority: 'alta' }),
    task({ text: 'límite semana', due_date: '2026-10-19' }),
    task({ text: 'adelante', due_date: '2026-10-20' }),
    task({ text: 'sin fecha' }),
    task({ text: 'hecha', done: true, done_on: T }),
    task({ text: 'hecha atrasada', done: true, due_date: '2026-10-01' }),
  ]

  it('agrupa con el criterio del prototipo', () => {
    const { groups, done } = groupTasks(tasks, T)
    const by = Object.fromEntries(groups.map((g) => [g.name, g.items.map((t) => t.text)]))
    expect(by).toEqual({
      Atrasados: ['rutina atrasada', 'atrasada'],
      Hoy: ['hoy'],
      'Esta semana': ['semana alta', 'semana baja', 'límite semana'],
      'Más adelante': ['adelante'],
      'Sin fecha': ['sin fecha'],
    })
    expect(done.map((t) => t.text).sort()).toEqual(['hecha', 'hecha atrasada'])
  })

  it('atrasados incluye rutinas y la insignia suma hoy', () => {
    expect(overdueTasks(tasks, T).map((t) => t.text)).toEqual(['rutina atrasada', 'atrasada'])
    expect(tasksBadge(tasks, T)).toBe(3)
  })

  it('filtros: Míos y De la pareja incluyen "Ambos"', () => {
    const me = 'yo'
    const pa = 'pareja'
    const list = [
      task({ text: 'mía', assignee_id: me }),
      task({ text: 'suya', assignee_id: pa }),
      task({ text: 'ambos', is_shared: true }),
      task({ text: 'libre' }),
      task({ text: 'rutina', repeat: 'semanal' }),
    ]
    const names = (f: Parameters<typeof filterTasks>[1]) =>
      filterTasks(list, f, me, pa).map((t) => t.text)
    expect(names('mios')).toEqual(['mía', 'ambos'])
    expect(names('pareja')).toEqual(['suya', 'ambos'])
    expect(names('libres')).toEqual(['libre', 'rutina'])
    expect(names('rutinas')).toEqual(['rutina'])
    expect(names('todos')).toHaveLength(5)
  })
})
