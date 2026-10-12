import { nextAfter, nextOcc, nth, occDates } from '@/lib/recurrencia'

describe('nth', () => {
  it('31 ene + 1 mes = 28 feb, y no arrastra el 28 a los meses siguientes', () => {
    expect(nth('2026-01-31', 'mensual', 1)).toBe('2026-02-28')
    expect(nth('2026-01-31', 'mensual', 2)).toBe('2026-03-31')
    expect(nth('2026-01-31', 'mensual', 3)).toBe('2026-04-30')
  })
  it('29 feb en año bisiesto', () => {
    expect(nth('2028-02-29', 'anual', 1)).toBe('2029-02-28')
    expect(nth('2028-02-29', 'anual', 4)).toBe('2032-02-29')
  })
  it('semanal, quincenal, bimestral, semestral', () => {
    expect(nth('2026-10-12', 'semanal', 2)).toBe('2026-10-26')
    expect(nth('2026-10-12', 'quincenal', 1)).toBe('2026-10-26')
    expect(nth('2026-10-15', 'bimestral', 1)).toBe('2026-12-15')
    expect(nth('2026-08-31', 'semestral', 1)).toBe('2027-02-28')
  })
  it('sin repetición devuelve la base', () => {
    expect(nth('2026-10-12', null, 5)).toBe('2026-10-12')
  })
})

describe('occDates', () => {
  it('sin repetición: solo si cae en el rango', () => {
    expect(occDates('2026-10-12', null, '2026-10-01', '2026-10-31')).toEqual(['2026-10-12'])
    expect(occDates('2026-11-12', null, '2026-10-01', '2026-10-31')).toEqual([])
    expect(occDates(null, 'semanal', '2026-10-01', '2026-10-31')).toEqual([])
  })
  it('semanal dentro del mes', () => {
    expect(occDates('2026-09-03', 'semanal', '2026-10-01', '2026-10-31')).toEqual([
      '2026-10-01',
      '2026-10-08',
      '2026-10-15',
      '2026-10-22',
      '2026-10-29',
    ])
  })
  it('mensual desde una base muy anterior', () => {
    expect(occDates('2020-01-31', 'mensual', '2026-02-01', '2026-04-30')).toEqual([
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })
  it('anual (cumpleaños) y base posterior al rango', () => {
    expect(occDates('1962-10-17', 'anual', '2026-10-01', '2026-10-31')).toEqual(['2026-10-17'])
    expect(occDates('2027-01-05', 'semanal', '2026-10-01', '2026-10-31')).toEqual([])
  })
})

describe('nextAfter', () => {
  it('atrasada varios periodos: primera ocurrencia ≥ hoy desde la original', () => {
    expect(nextAfter('2026-09-22', 'semanal', '2026-10-12')).toBe('2026-10-13')
    expect(nextAfter('2026-05-31', 'mensual', '2026-10-12')).toBe('2026-10-31')
  })
  it('adelantada: pasa al siguiente periodo', () => {
    expect(nextAfter('2026-10-15', 'bimestral', '2026-10-12')).toBe('2026-12-15')
  })
  it('vence hoy: el siguiente periodo', () => {
    expect(nextAfter('2026-10-12', 'semanal', '2026-10-12')).toBe('2026-10-19')
  })
})

describe('nextOcc', () => {
  it('este año si aún no pasa, si no el siguiente', () => {
    expect(nextOcc('1962-10-17', true, '2026-10-12')).toBe('2026-10-17')
    expect(nextOcc('1962-10-01', true, '2026-10-12')).toBe('2027-10-01')
    expect(nextOcc('1962-10-12', true, '2026-10-12')).toBe('2026-10-12')
  })
  it('29 de febrero en año no bisiesto → 28', () => {
    expect(nextOcc('2000-02-29', true, '2026-01-10')).toBe('2026-02-28')
    expect(nextOcc('2000-02-29', true, '2027-03-01')).toBe('2028-02-29')
  })
  it('no anual: la propia fecha', () => {
    expect(nextOcc('2026-10-24', false, '2026-10-12')).toBe('2026-10-24')
  })
})
