import {
  avisoPendientes,
  avisoRecordatorio,
  pendientesPorRecordar,
  recordatoriosPorEnviar,
} from '@/lib/recordatorios'
import type { CalendarEvent, Task } from '@/types/db'

const ev = (o: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'e',
  created_by: null,
  created_at: '',
  updated_at: '',
  title: 'Evento',
  date: '2026-10-12',
  time: '10:00:00',
  repeat: null,
  owner_id: null,
  is_shared: true,
  place: null,
  notes: null,
  ...o,
})
const yo = { id: 'yo', event_reminders: true }
const malu = { id: 'malu', event_reminders: true }
// Hora de la Ciudad de México = UTC − 6
const a = (local: string) => new Date(`${local}:00-06:00`)

describe('recordatorios de eventos', () => {
  it('entra cuando faltan 30 min o menos, no antes ni después de empezar', () => {
    const e = [ev({})]
    expect(recordatoriosPorEnviar(e, [yo], a('2026-10-12T09:29'))).toEqual([])
    expect(recordatoriosPorEnviar(e, [yo], a('2026-10-12T09:30'))[0]!.minutos).toBe(30)
    expect(recordatoriosPorEnviar(e, [yo], a('2026-10-12T09:59'))[0]!.minutos).toBe(1)
    expect(recordatoriosPorEnviar(e, [yo], a('2026-10-12T10:00'))).toEqual([])
  })

  it('va al dueño; los de Ambos o sin dueño a los dos; quien los apagó no recibe', () => {
    const ahora = a('2026-10-12T09:45')
    expect(
      recordatoriosPorEnviar([ev({ owner_id: 'malu', is_shared: false })], [yo, malu], ahora)[0]!
        .para,
    ).toEqual(['malu'])
    expect(recordatoriosPorEnviar([ev({})], [yo, malu], ahora)[0]!.para).toEqual(['yo', 'malu'])
    expect(
      recordatoriosPorEnviar([ev({})], [yo, { id: 'malu', event_reminders: false }], ahora)[0]!
        .para,
    ).toEqual(['yo'])
  })

  it('cruza la medianoche, respeta repeticiones e ignora los de todo el día', () => {
    const r = recordatoriosPorEnviar(
      [
        ev({ id: 'noche', date: '2026-10-13', time: '00:10:00' }),
        ev({ id: 'semanal', date: '2026-10-06', time: '00:15:00', repeat: 'semanal' }),
        ev({ id: 'dia', date: '2026-10-13', time: null }),
      ],
      [yo],
      a('2026-10-12T23:50'),
    )
    expect(r.map((x) => [x.event.id, x.date, x.minutos])).toEqual([
      ['noche', '2026-10-13', 20],
      ['semanal', '2026-10-13', 25],
    ])
  })

  it('texto: minutos, título con niño, hora y lugar', () => {
    const [r] = recordatoriosPorEnviar(
      [ev({ title: 'Pediatra', kid: 'Sofi', time: '16:30:00', place: 'Consultorio Roma' })],
      [yo],
      a('2026-10-12T16:00'),
    )
    expect(avisoRecordatorio(r!)).toEqual({
      title: 'En 30 min: Pediatra · Sofi',
      body: '16:30 · Consultorio Roma',
    })
  })
})

describe('recordatorios de pendientes', () => {
  const tarea = (o: Partial<Task>): Task => ({
    id: 't',
    created_by: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '',
    text: 'Pagar predial',
    assignee_id: null,
    is_shared: false,
    due_date: '2026-10-13',
    priority: 'media',
    category: 'Pagos',
    repeat: null,
    rotate: false,
    notes: null,
    done: false,
    done_on: null,
    last_done_on: null,
    last_done_by: null,
    ...o,
  })
  const yo = { id: 'yo', task_reminders: true }
  const malu = { id: 'malu', task_reminders: true }
  const tipos = (r: ReturnType<typeof pendientesPorRecordar>) =>
    r.map((g) => `${g.memberId}:${g.tipo}:${g.tasks.map((t) => t.id).join(',')}`)

  it('víspera desde las 20:00; el día y "se pasó" desde las 9:00', () => {
    const tareas = [
      tarea({ id: 'manana', due_date: '2026-10-13' }),
      tarea({ id: 'hoy', due_date: '2026-10-12' }),
      tarea({ id: 'ayer', due_date: '2026-10-11' }),
      tarea({ id: 'antier', due_date: '2026-10-10' }),
    ]
    expect(tipos(pendientesPorRecordar(tareas, [yo], a('2026-10-12T08:59')))).toEqual([])
    expect(tipos(pendientesPorRecordar(tareas, [yo], a('2026-10-12T09:00')))).toEqual([
      'yo:hoy:hoy',
      'yo:tarde:ayer',
    ])
    expect(tipos(pendientesPorRecordar(tareas, [yo], a('2026-10-12T20:00')))).toEqual([
      'yo:antes:manana',
      'yo:hoy:hoy',
      'yo:tarde:ayer',
    ])
  })

  it('al responsable; Ambos o sin asignar a los dos; hechos, apagados y recién creados no', () => {
    const ahora = a('2026-10-12T21:00')
    const r = pendientesPorRecordar(
      [
        tarea({ id: 'de-malu', assignee_id: 'malu' }),
        tarea({ id: 'ambos', is_shared: true }),
        tarea({ id: 'libre' }),
        tarea({ id: 'hecho', done: true }),
        tarea({ id: 'rutina', done: true, repeat: 'mensual' }),
        tarea({ id: 'recien', created_by: 'yo', created_at: '2026-10-13T02:30:00Z' }),
      ],
      [yo, malu, { id: 'callado', task_reminders: false }],
      ahora,
    )
    expect(tipos(r)).toEqual([
      'yo:antes:ambos,libre,rutina',
      'malu:antes:de-malu,ambos,libre,rutina,recien',
    ])
  })

  it('texto: uno con su nombre; varios con la lista', () => {
    expect(avisoPendientes('hoy', [{ text: 'Pagar predial' }]).title).toBe('Hoy: Pagar predial')
    expect(avisoPendientes('tarde', [{ text: 'Pagar predial' }])).toEqual({
      title: 'Se pasó: Pagar predial',
      body: 'Sigue sin marcarse como hecho.',
    })
    const varios = avisoPendientes(
      'antes',
      ['a', 'b', 'c', 'd', 'e'].map((text) => ({ text })),
    )
    expect(varios.title).toBe('Mañana vencen 5 pendientes')
    expect(varios.body).toBe('• a\n• b\n• c\n• d\n…y 1 más')
  })
})
