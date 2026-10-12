// Copia la lógica pura que comparten la web y las Edge Functions (Deno).
// Fuente única: src/lib (y src/types/db.ts). Destino: supabase/functions/_shared.
// Reescribe las importaciones al estilo de Deno: './x' → './x.ts' y '@/types/db' → './db.ts'.
// Uso: pnpm sync:shared   (una prueba unitaria falla si las copias se desincronizan)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SHARED = [
  ['src/lib/fechas.ts', 'fechas.ts'],
  ['src/lib/recurrencia.ts', 'recurrencia.ts'],
  ['src/lib/texto.ts', 'texto.ts'],
  ['src/lib/categorias.ts', 'categorias.ts'],
  ['src/lib/listas.ts', 'listas.ts'],
  ['src/lib/pendientes.ts', 'pendientes.ts'],
  ['src/lib/fechas-importantes.ts', 'fechas-importantes.ts'],
  ['src/lib/calendario.ts', 'calendario.ts'],
  ['src/lib/telegram.ts', 'telegram-texto.ts'],
  ['src/lib/gcal.ts', 'gcal.ts'],
  ['src/types/db.ts', 'db.ts'],
]

const AVISO = '// ⚠ Copia generada por `pnpm sync:shared`. Edita el original en src/.\n'

export function transformar(codigo) {
  return (
    AVISO +
    codigo
      .replace(/from '@\/types\/db'/g, "from './db.ts'")
      .replace(
        /from '@\/lib\/([\w-]+)'/g,
        (_, f) => `from './${f === 'telegram' ? 'telegram-texto' : f}.ts'`,
      )
      .replace(
        /from '\.\/([\w-]+)'/g,
        (_, f) => `from './${f === 'telegram' ? 'telegram-texto' : f}.ts'`,
      )
  )
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const destino = (f) => join(root, 'supabase/functions/_shared', f)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(root, 'supabase/functions/_shared'), { recursive: true })
  for (const [src, dst] of SHARED) {
    writeFileSync(destino(dst), transformar(readFileSync(join(root, src), 'utf8')))
    console.log(`✔ ${dst}`)
  }
}
