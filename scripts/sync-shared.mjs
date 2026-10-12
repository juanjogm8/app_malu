// Copia la lógica pura que comparten la web y las Edge Functions (Deno).
// Fuente única: src/lib. Destino: supabase/functions/_shared. Uso: pnpm sync:shared
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SHARED = ['fechas.ts', 'recurrencia.ts']

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'supabase/functions/_shared')

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(dest, { recursive: true })
  for (const f of SHARED) {
    copyFileSync(join(root, 'src/lib', f), join(dest, f))
    console.log(`✔ ${f}`)
  }
}
