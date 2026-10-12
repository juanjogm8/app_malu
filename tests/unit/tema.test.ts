import { applyTheme, getThemePref, setThemePref } from '@/lib/tema'

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('por defecto sigue al sistema', () => {
    expect(getThemePref()).toBe('system')
    applyTheme(getThemePref())
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('recuerda el tema manual y lo aplica', () => {
    setThemePref('dark')
    expect(getThemePref()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    setThemePref('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('volver a automático borra la preferencia', () => {
    setThemePref('dark')
    setThemePref('system')
    expect(getThemePref()).toBe('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('ignora valores inválidos guardados', () => {
    localStorage.setItem('casa:tema', 'morado')
    expect(getThemePref()).toBe('system')
  })
})
