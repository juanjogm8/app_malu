import { aHoraLocal, eventoAGoogle, googleAFila, PROPIEDAD_APP, rrule } from '@/lib/gcal'

describe('rrule', () => {
  it('semanal, quincenal y meses desde la fecha original', () => {
    expect(rrule('semanal', '2026-10-12')).toEqual(['RRULE:FREQ=WEEKLY'])
    expect(rrule('quincenal', '2026-10-12')).toEqual(['RRULE:FREQ=WEEKLY;INTERVAL=2'])
    expect(rrule('mensual', '2026-10-15')).toEqual(['RRULE:FREQ=MONTHLY;BYMONTHDAY=15'])
    expect(rrule('bimestral', '2026-10-15')).toEqual([
      'RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15',
    ])
    expect(rrule(null, '2026-10-15')).toBeUndefined()
  })
  it('día 31 → último día del mes; día 30 → 30 o el último', () => {
    expect(rrule('mensual', '2026-01-31')).toEqual([
      'RRULE:FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1',
    ])
    expect(rrule('mensual', '2026-01-30')).toEqual([
      'RRULE:FREQ=MONTHLY;BYMONTHDAY=28,29,30;BYSETPOS=-1',
    ])
  })
  it('anual del 29 de febrero', () => {
    expect(rrule('anual', '2028-02-29')).toEqual([
      'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1',
    ])
    expect(rrule('anual', '1962-10-17')).toEqual(['RRULE:FREQ=YEARLY;BYMONTH=10;BYMONTHDAY=17'])
  })
})

describe('conversión', () => {
  const ev = {
    id: 'abc',
    title: 'Cena',
    date: '2026-10-20',
    time: '20:00:00',
    repeat: null,
    place: 'Roma',
    notes: null,
  }
  it('evento con hora: una hora de duración en hora de CDMX y marcado como de la app', () => {
    const g = eventoAGoogle(ev)
    expect(g.start).toEqual({ dateTime: '2026-10-20T20:00:00', timeZone: 'America/Mexico_City' })
    expect(g.end).toEqual({ dateTime: '2026-10-20T21:00:00', timeZone: 'America/Mexico_City' })
    expect(g.extendedProperties!.private![PROPIEDAD_APP]).toBe('abc')
    expect(g.location).toBe('Roma')
  })
  it('evento a las 23:30 termina al día siguiente; todo el día usa fecha exclusiva', () => {
    expect(eventoAGoogle({ ...ev, time: '23:30' }).end).toEqual({
      dateTime: '2026-10-21T00:30:00',
      timeZone: 'America/Mexico_City',
    })
    const g = eventoAGoogle({ ...ev, time: null })
    expect(g.start).toEqual({ date: '2026-10-20' })
    expect(g.end).toEqual({ date: '2026-10-21' })
  })
  it('hora local de la Ciudad de México', () => {
    expect(aHoraLocal('2026-10-13T16:00:00Z')).toEqual({ date: '2026-10-13', time: '10:00' })
    expect(aHoraLocal('2026-10-13T03:00:00Z')).toEqual({ date: '2026-10-12', time: '21:00' })
    expect(aHoraLocal('2026-10-13T10:00:00-05:00')).toEqual({ date: '2026-10-13', time: '09:00' })
  })
  it('Google → fila; ignora cancelados y los que publicó la app', () => {
    expect(
      googleAFila(
        {
          id: 'g1',
          summary: 'Junta',
          start: { dateTime: '2026-10-13T16:00:00Z' },
          htmlLink: 'https://g/1',
        },
        'yo',
        'primary',
      ),
    ).toMatchObject({
      google_event_id: 'g1',
      title: 'Junta',
      date: '2026-10-13',
      time: '10:00',
      html_link: 'https://g/1',
    })
    expect(googleAFila({ id: 'g2', start: { date: '2026-10-14' } }, 'yo', 'primary')).toMatchObject(
      { title: '(Sin título)', time: null },
    )
    expect(googleAFila({ id: 'g3', status: 'cancelled' }, 'yo', 'primary')).toBe(null)
    expect(
      googleAFila(
        {
          id: 'g4',
          start: { date: '2026-10-14' },
          extendedProperties: { private: { [PROPIEDAD_APP]: 'x' } },
        },
        'yo',
        'c',
      ),
    ).toBe(null)
  })
})
