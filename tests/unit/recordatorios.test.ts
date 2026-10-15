import { avisoRecordatorio, recordatoriosPorEnviar } from '@/lib/recordatorios'
import type { CalendarEvent } from '@/types/db'

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
