/* Secciones del súper y sugerencia automática (portado de guessCat del prototipo). */
import type { ShoppingCategory } from '@/types/db'
import { norm } from './texto'

/** Orden fijo del catálogo. */
export const CATS: [ShoppingCategory, string][] = [
  ['frutas', 'Frutas y verduras'],
  ['carnes', 'Carnes y pescado'],
  ['lacteos', 'Lácteos y huevo'],
  ['pan', 'Pan y tortillas'],
  ['despensa', 'Despensa'],
  ['bebidas', 'Bebidas'],
  ['congelados', 'Congelados'],
  ['limpieza', 'Limpieza y hogar'],
  ['cuidado', 'Cuidado personal y bebé'],
  ['otros', 'Otros'],
]

export const CAT_NAME = Object.fromEntries(CATS) as Record<ShoppingCategory, string>

const KW: Partial<Record<ShoppingCategory, string>> = {
  frutas:
    'jitomate tomate cebolla cebollitas ajo limon aguacate platano manzana naranja fresa uva papa zanahoria calabaza chile cilantro lechuga espinaca pepino brocoli elote mango papaya sandia melon pina pera durazno nopal verdura verduras fruta frutas perejil epazote champinon champinones apio betabel chayote ejote jicama mandarina toronja guayaba',
  carnes:
    'pollo res carne bistec molida cerdo chuleta jamon tocino salchicha pescado atun salmon camaron chorizo arrachera milanesa pechuga muslo costilla longaniza tilapia',
  lacteos:
    'leche queso crema huevo huevos yogurt yoghurt mantequilla requeson panela oaxaca margarina',
  pan: 'pan tortilla tortillas bolillo bolillos telera concha conchas bimbo baguette tostadas',
  despensa:
    'arroz frijol frijoles pasta sopa aceite sal azucar harina cafe cereal avena galletas lenteja lentejas salsa mayonesa mostaza catsup vinagre miel mermelada chocolate nueces almendras cacahuate lata especias pimienta canela',
  bebidas:
    'agua refresco jugo cerveza vino mezcal tequila energizante gatorade electrolit limonada',
  congelados: 'helado hielo pizza congelado congelados nuggets paletas',
  limpieza:
    'jabon detergente cloro suavizante servilletas bolsas basura escoba trapeador fabuloso pinol esponja trastes lavatrastes limpiador desinfectante pila pilas foco focos aluminio',
  cuidado:
    'shampoo champu enjuague cepillo desodorante rastrillo toallas panales panal toallitas talco protector',
}

/** Frases que mandan sobre las palabras sueltas. */
const PHRASES: [string, ShoppingCategory][] = [
  ['pasta dental', 'cuidado'],
  ['crema dental', 'cuidado'],
  ['papel de bano', 'limpieza'],
  ['papel higienico', 'limpieza'],
  ['papel aluminio', 'limpieza'],
  ['pan dulce', 'pan'],
  ['agua de', 'bebidas'],
]

const KWMAP = new Map<string, ShoppingCategory>()
for (const [cat, words] of Object.entries(KW) as [ShoppingCategory, string][]) {
  for (const w of norm(words).split(/\s+/)) if (w && !KWMAP.has(w)) KWMAP.set(w, cat)
}

/** Sección sugerida para un producto; la primera palabra que coincida gana. */
export function guessCat(text: string): ShoppingCategory {
  const t = norm(text)
  for (const [p, cat] of PHRASES) if (t.includes(p)) return cat
  for (const w of t.split(/[^a-z0-9]+/)) {
    if (!w) continue
    const hit =
      KWMAP.get(w) ??
      (w.endsWith('es') ? KWMAP.get(w.slice(0, -2)) : undefined) ??
      (w.endsWith('s') ? KWMAP.get(w.slice(0, -1)) : undefined)
    if (hit) return hit
  }
  return 'otros'
}
