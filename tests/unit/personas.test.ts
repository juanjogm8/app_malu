import { firstName } from '@/lib/personas'

describe('firstName', () => {
  it('toma el primer nombre', () => {
    expect(firstName({ name: 'Juan José Gómez', email: 'x@y.com' })).toBe('Juan')
  })
  it('usa el correo si no hay nombre', () => {
    expect(firstName({ name: '', email: 'm.rm91@hotmail.com' })).toBe('m.rm91@hotmail.com')
  })
})
