import { useState } from 'react'
import type { FormEvent } from 'react'
import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import { Esqueleto } from '@/components/Esqueleto'
import { Icon } from '@/components/Icon'
import { Boton, Casilla, Pildora, Segmentado, Tarjeta, Vacio } from '@/components/ui'
import { fila } from '@/components/estilos'
import type { PildoraTono } from '@/components/ui'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { money, parsePrice } from '@/lib/dinero'
import { purchaseGroups } from '@/lib/listas'
import type { Purchase } from '@/types/db'

const t = es.listas
type Prio = Purchase['priority']
const PRIOS: [Prio, string][] = [
  ['alta', es.prioridad.alta],
  ['media', es.prioridad.media],
  ['baja', es.prioridad.baja],
]
const TONO_PRIO: Record<Prio, PildoraTono> = { alta: 'danger', media: 'warn', baja: 'tint-muted' }

/** "https://www.liverpool.com.mx/x" → "liverpool.com.mx" */
function lugar(store: string | null): { texto: string; url?: string } {
  if (!store) return { texto: t.porDefinir }
  if (/^https?:\/\//i.test(store)) {
    try {
      return { texto: new URL(store).hostname.replace(/^www\./, ''), url: store }
    } catch {
      return { texto: store }
    }
  }
  return { texto: store }
}

export function ComprasPage() {
  const { rows, loading } = useRows('purchases')
  const { pending, done, total } = purchaseGroups(rows)

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
            {es.titulos.compras}
          </h1>
          {rows.length > 0 && (
            <p className="mt-1.5 text-[14px] text-muted">{t.pendientesN(pending.length)}</p>
          )}
        </div>
        {total > 0 && (
          <div className="text-right">
            <div className="eyebrow text-muted">{t.totalAprox}</div>
            <div className="tnum font-display text-[26px] leading-[1.1]">{money(total)}</div>
          </div>
        )}
      </div>

      <Captura />

      {loading ? (
        <Esqueleto />
      ) : !rows.length ? (
        <Vacio icon="listas" titulo={t.vacioCompras} texto={t.vacioComprasTexto} />
      ) : (
        <>
          {pending.length > 0 && (
            <Tarjeta>
              {pending.map((c, i) => (
                <FilaCompra key={c.id} c={c} i={i} />
              ))}
            </Tarjeta>
          )}
          {done.length > 0 && (
            <div>
              <div className="flex items-baseline gap-2 px-1 pb-2">
                <h2 className="font-display text-[22px] font-normal">{t.comprado}</h2>
                <span className="text-[13px] font-bold text-muted">{done.length}</span>
              </div>
              <Tarjeta>
                {done.map((c, i) => (
                  <FilaCompra key={c.id} c={c} i={i} />
                ))}
              </Tarjeta>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function FilaCompra({ c, i }: { c: Row<'purchases'>; i: number }) {
  const w = useEscritura()
  const hojas = useHojas()
  const l = lugar(c.store)
  return (
    <div className={`flex min-h-[66px] items-center gap-3 py-2.5 pr-3 pl-[14px] ${fila(i)}`}>
      <Casilla
        checked={c.done}
        onChange={() => void w.update('purchases', c.id, { done: !c.done })}
        label={c.text}
      />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => hojas.editarCompra(c)}
          className={`block text-left text-[16px] font-semibold ${c.done ? 'text-muted line-through' : ''}`}
        >
          {c.text}
        </button>
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          {l.url ? (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <Icon name="enlace" size={13} stroke={2.2} className="flex-none" />
              <span className="truncate">{l.texto}</span>
            </a>
          ) : (
            <span className="truncate">{l.texto}</span>
          )}
          {c.price != null && (
            <>
              <span aria-hidden="true">·</span>
              <b className="tnum text-ink">{money(c.price)}</b>
            </>
          )}
        </div>
      </div>
      {!c.done && (
        <Pildora
          label={t.prioridad}
          value={c.priority}
          options={PRIOS}
          tono={TONO_PRIO[c.priority]}
          onChange={(v) => void w.update('purchases', c.id, { priority: v })}
        />
      )}
    </div>
  )
}

function Captura() {
  const w = useEscritura()
  const [texto, setTexto] = useState('')
  const [costo, setCosto] = useState('')
  const [donde, setDonde] = useState('')
  const [prio, setPrio] = useState<Prio>('media')

  const agregar = async (e: FormEvent) => {
    e.preventDefault()
    const text = texto.trim()
    if (!text) return
    const ok = await w.insert('purchases', {
      text,
      price: parsePrice(costo),
      store: donde.trim() || null,
      priority: prio,
    })
    if (ok) {
      setTexto('')
      setCosto('')
      setDonde('')
      setPrio('media')
    }
  }

  return (
    <form
      onSubmit={(e) => void agregar(e)}
      className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-surface p-3"
    >
      <input
        className="field"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t.queComprar}
        aria-label={t.queComprar}
        maxLength={120}
      />
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <span className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            className="field tnum pl-7"
            inputMode="decimal"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            placeholder={t.costo}
            aria-label={t.costo}
          />
        </span>
        <input
          className="field"
          value={donde}
          onChange={(e) => setDonde(e.target.value)}
          placeholder={t.donde}
          aria-label={t.donde}
          maxLength={500}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Segmentado chico label={t.prioridad} value={prio} options={PRIOS} onChange={setPrio} />
        </div>
        <Boton type="submit" compacto>
          {t.agregar}
        </Boton>
      </div>
    </form>
  )
}
