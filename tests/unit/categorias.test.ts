import { guessCat } from '@/lib/categorias'

describe('guessCat', () => {
  it.each([
    ['Leche 2 L', 'lacteos'],
    ['Jitomates', 'frutas'],
    ['Papel de baño', 'limpieza'],
    ['Pasta dental', 'cuidado'],
    ['Tortillas de harina', 'pan'],
    ['Pañales', 'cuidado'],
    ['Cerveza', 'bebidas'],
    ['Cosa rara', 'otros'],
    ['Agua de jamaica', 'bebidas'],
    ['Pan dulce', 'pan'],
    ['Papel aluminio', 'limpieza'],
    ['LIMÓN', 'frutas'],
    ['Huevo', 'lacteos'],
    ['Queso Oaxaca', 'lacteos'],
    ['Pechuga de pollo', 'carnes'],
  ])('%s → %s', (text, cat) => {
    expect(guessCat(text)).toBe(cat)
  })
})
