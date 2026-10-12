import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SHARED = ['fechas.ts', 'recurrencia.ts']

describe('lógica compartida con las Edge Functions', () => {
  it.each(SHARED)('%s está sincronizado (corre `pnpm sync:shared`)', (f) => {
    const src = readFileSync(join(process.cwd(), 'src/lib', f), 'utf8')
    const copy = readFileSync(join(process.cwd(), 'supabase/functions/_shared', f), 'utf8')
    expect(copy).toBe(src)
  })

  it.each(SHARED)('%s solo importa archivos compartidos con extensión .ts', (f) => {
    const src = readFileSync(join(process.cwd(), 'src/lib', f), 'utf8')
    const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1])
    for (const i of imports) expect(SHARED.map((s) => `./${s}`)).toContain(i)
  })
})
