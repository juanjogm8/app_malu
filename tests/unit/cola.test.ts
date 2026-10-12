import { completarLocal, debeAplicarse, idsPendientes } from '@/lib/cola'
import type { Task } from '@/types/db'

const t0: Task = {
  id: 't',
  created_by: null,
  created_at: '',
  updated_at: '',
  text: 'x',
  assignee_id: 'a',
  is_shared: false,
  due_date: '2026-10-05',
  priority: 'media',
  category: 'Casa',
  repeat: 'semanal',
  rotate: true,
  notes: null,
  done: false,
  done_on: null,
  last_done_on: null,
  last_done_by: null,
}
const members = [
  { id: 'a', created_at: '2026-01-01' },
  { id: 'b', created_at: '2026-01-02' },
]

describe('cola sin conexión', () => {
  it('completar una rutina da lo mismo que complete_task (incluida la rotación)', () => {
    expect(completarLocal(t0, '2026-10-12', 'a', members)).toEqual({
      due_date: '2026-10-12',
      last_done_on: '2026-10-12',
      last_done_by: 'a',
      assignee_id: 'b',
    })
    expect(completarLocal({ ...t0, rotate: false }, '2026-10-12', 'a', members).assignee_id).toBe(
      'a',
    )
    expect(completarLocal({ ...t0, repeat: null }, '2026-10-12', 'a', members)).toEqual({
      done: true,
      done_on: '2026-10-12',
    })
  })
  it('gana la última escritura', () => {
    expect(debeAplicarse('2026-10-12T10:00:00Z', '2026-10-12T09:00:00Z')).toBe(true)
    expect(debeAplicarse('2026-10-12T10:00:00Z', '2026-10-12T11:00:00Z')).toBe(false)
    expect(debeAplicarse('2026-10-12T10:00:00Z', null)).toBe(true)
  })
  it('ids por enviar', () => {
    const s = idsPendientes([
      { op_id: '1', ts: '', op: { tipo: 'insert', tabla: 'x', fila: { id: 'n' } } },
      { op_id: '2', ts: '', op: { tipo: 'update', tabla: 'x', id: 'u', patch: {} } },
      { op_id: '3', ts: '', op: { tipo: 'delete', tabla: 'x', ids: ['d'] } },
    ])
    expect([...s].sort()).toEqual(['n', 'u'])
  })
})
