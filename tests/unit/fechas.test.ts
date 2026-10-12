import {
  addDays,
  addMonths,
  diff,
  dow,
  fDay,
  fLong,
  fRange,
  fShort,
  fTime,
  fWdShort,
  startOfWeek,
  today,
} from '@/lib/fechas'

describe('fechas', () => {
  it('hoy usa la hora de la Ciudad de México', () => {
    // 2026-10-13 04:30 UTC = 2026-10-12 22:30 en CDMX (UTC−6)
    expect(today(new Date('2026-10-13T04:30:00Z'))).toBe('2026-10-12')
    expect(today(new Date('2026-10-13T06:30:00Z'))).toBe('2026-10-13')
  })

  it('suma días cruzando mes y año', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  })

  it('suma meses ajustando al último día', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-01-31', 3)).toBe('2026-04-30')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('diferencia, día de la semana e inicio de semana (lunes)', () => {
    expect(diff('2026-10-17', '2026-10-12')).toBe(5)
    expect(dow('2026-10-12')).toBe(0) // lunes
    expect(dow('2026-10-18')).toBe(6) // domingo
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12')
    expect(startOfWeek('2026-10-01')).toBe('2026-09-28')
  })

  it('formatos del diseño', () => {
    expect(fLong('2026-10-12')).toBe('Lunes 12 de octubre')
    expect(fDay('2026-10-13')).toBe('Martes 13')
    expect(fShort('2026-10-08')).toBe('8 oct')
    expect(fWdShort('2026-10-17')).toBe('Sáb 17 oct')
    expect(fRange('2026-10-12', '2026-10-18')).toBe('12 – 18 oct')
    expect(fRange('2026-09-28', '2026-10-04')).toBe('28 sep – 4 oct')
    expect(fTime('08:30:00')).toBe('8:30')
    expect(fTime(null)).toBe('')
  })
})
