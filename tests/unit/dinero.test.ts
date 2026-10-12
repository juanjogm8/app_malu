import { money, parsePrice } from '@/lib/dinero'

describe('dinero', () => {
  it('formatea MXN sin centavos si es entero', () => {
    expect(money(4250)).toBe('$4,250')
    expect(money(1250.5)).toBe('$1,250.50')
  })
  it('interpreta lo que escribe la persona', () => {
    expect(parsePrice('$1,250')).toBe(1250)
    expect(parsePrice('99.999')).toBe(100)
    expect(parsePrice('')).toBe(null)
    expect(parsePrice('0')).toBe(null)
  })
})
