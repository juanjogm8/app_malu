import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// @ts-expect-error módulo JS sin tipos
import { SHARED, destino, transformar } from '../../scripts/sync-shared.mjs'

const lista = SHARED as [string, string][]

describe('lógica compartida con las Edge Functions', () => {
  it.each(lista)('%s está sincronizado (corre `pnpm sync:shared`)', (src, dst) => {
    const original = readFileSync(join(process.cwd(), src), 'utf8')
    const copia = readFileSync((destino as (f: string) => string)(dst), 'utf8')
    expect(copia).toBe((transformar as (c: string) => string)(original))
  })

  it.each(lista)('%s solo importa archivos compartidos', (src) => {
    const original = readFileSync(join(process.cwd(), src), 'utf8')
    const permitidos = new Set(lista.map(([s]) => s))
    for (const [, imp] of original.matchAll(/from '([^']+)'/g)) {
      const ruta = imp!.startsWith('@/')
        ? `src/${imp!.slice(2)}.ts`
        : `src/lib/${imp!.replace(/^\.\//, '').replace(/\.ts$/, '')}.ts`
      expect(permitidos, `${src} importa ${imp}`).toContain(ruta)
    }
  })
})
