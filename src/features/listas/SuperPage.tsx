import { useState } from 'react'
import type { FormEvent } from 'react'
import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { usePreferencia } from '@/app/preferencias'
import { Avatar } from '@/components/Avatar'
import { Esqueleto } from '@/components/Esqueleto'
import { Icon } from '@/components/Icon'
import { Boton, Casilla, Confirmar, Interruptor, Tarjeta, Vacio } from '@/components/ui'
import { fila } from '@/components/estilos'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { CATS } from '@/lib/categorias'
import { superSections } from '@/lib/listas'
import { useAgregarAlSuper } from './agregarSuper'
import type { ShoppingCategory } from '@/types/db'

const t = es.listas

export function SuperPage() {
  const { rows: items, loading } = useRows('shopping_items')
  const w = useEscritura()
  const agregar = useAgregarAlSuper()
  const [ocultar, setOcultar] = usePreferencia('super:ocultar', false)
  const [confirmar, setConfirmar] = useState(false)

  const total = items.length
  const comprados = items.filter((i) => i.done)
  const secciones = superSections(items, ocultar)
  const pct = total ? Math.round((comprados.length / total) * 100) : 0

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3.5">
        {total > 0 && (
          <div
            role="img"
            aria-label={t.enCarrito(comprados.length, total)}
            className="grid size-16 flex-none place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--sun) 0 ${pct}%, var(--line) ${pct}% 100%)` }}
          >
            <span className="grid size-[50px] place-items-center rounded-full bg-bg font-display text-[18px]">
              {comprados.length}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
            {es.titulos.super}
          </h1>
          {total > 0 && (
            <p className="mt-1 text-[14px] text-muted">{t.enCarrito(comprados.length, total)}</p>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className="-my-1 flex items-center justify-between gap-2">
          <Interruptor checked={ocultar} onChange={setOcultar}>
            {t.ocultar}
          </Interruptor>
          {comprados.length > 0 && !confirmar && (
            <Boton variante="enlace" chico className="px-1" onClick={() => setConfirmar(true)}>
              {t.limpiar(comprados.length)}
            </Boton>
          )}
        </div>
      )}
      {confirmar && (
        <Confirmar
          pregunta={t.limpiarPregunta(comprados.length)}
          si={t.limpiarSi}
          onSi={() => {
            setConfirmar(false)
            void w.remove('shopping_items', comprados, t.quitados(comprados.length))
          }}
          onNo={() => setConfirmar(false)}
        />
      )}

      {loading ? (
        <Esqueleto />
      ) : !total ? (
        <Vacio
          icon="listas"
          titulo={t.vacioSuper}
          texto={t.vacioSuperTexto}
          chips={[...t.staples]}
          onChip={(c) => void agregar(c)}
        />
      ) : !secciones.length ? (
        <Vacio icon="palomita" titulo={t.todoCarrito} texto={t.todoCarritoTexto} />
      ) : (
        secciones.map((sec) => (
          <div key={sec.cat}>
            <div className="flex items-baseline justify-between px-1 pb-1.5">
              <h2 className="font-display text-[19px] font-normal">{sec.name}</h2>
              <span className="text-[13px] text-muted">
                {sec.left ? t.faltan(sec.left) : t.completo}
              </span>
            </div>
            <Tarjeta>
              {sec.items.map((it, i) => (
                <FilaProducto key={it.id} it={it} i={i} />
              ))}
            </Tarjeta>
          </div>
        ))
      )}

      <Captura />
    </section>
  )
}

function FilaProducto({ it, i }: { it: Row<'shopping_items'>; i: number }) {
  const w = useEscritura()
  const p = usePersonas()
  const hojas = useHojas()
  return (
    <div className={`flex min-h-[54px] items-center gap-3 pr-1 pl-[14px] ${fila(i)}`}>
      <Casilla
        checked={it.done}
        onChange={() => void w.update('shopping_items', it.id, { done: !it.done })}
        label={it.text}
      />
      <span
        className={`flex-1 text-[17px] font-medium transition-colors duration-[var(--dur)] ${
          it.done ? 'text-muted line-through' : ''
        }`}
      >
        {it.text}
      </span>
      {it.created_by && (
        <Avatar member={p.byId(it.created_by)} slot={p.slot(it.created_by)} size={24} />
      )}
      <button
        type="button"
        aria-label={t.opciones(it.text)}
        onClick={() => hojas.editarProducto(it)}
        className="grid h-11 w-10 place-items-center text-muted"
      >
        <Icon name="kebab" size={18} stroke={1.8} />
      </button>
    </div>
  )
}

/** Captura fija abajo, sobre la navegación, al alcance del pulgar. */
function Captura() {
  const agregar = useAgregarAlSuper()
  const [texto, setTexto] = useState('')
  const [cat, setCat] = useState<ShoppingCategory | 'auto'>('auto')

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const text = texto.trim()
    if (!text) return
    setTexto('')
    setCat('auto')
    const r = await agregar(text, cat === 'auto' ? null : cat)
    if (r === 'error') setTexto(text)
  }

  return (
    <>
      <div className="h-[72px]" aria-hidden="true" />
      <form
        onSubmit={(e) => void enviar(e)}
        className="fixed inset-x-0 bottom-[var(--nav-h)] z-10 border-t border-line bg-bg"
      >
        <div className="mx-auto flex max-w-[720px] gap-2 px-4 py-2.5">
          <div className="flex h-[52px] min-w-0 flex-1 items-center rounded-[16px] border border-line bg-surface pr-1.5 focus-within:border-2 focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={t.agregarSuper}
              aria-label={t.agregarSuper}
              maxLength={120}
              enterKeyHint="send"
              className="h-full min-w-0 flex-1 bg-transparent pl-4 text-[16px] outline-none placeholder:text-muted focus-visible:shadow-none"
            />
            <label className="relative flex h-[38px] flex-none items-center gap-1 rounded-[12px] bg-tint px-2.5 text-[12px] font-semibold">
              {cat === 'auto' ? t.seccionAuto : CATS.find(([c]) => c === cat)?.[1]}
              <Icon name="abajo" size={12} stroke={2.6} />
              <select
                aria-label={t.seccion}
                value={cat}
                onChange={(e) => setCat(e.target.value as ShoppingCategory | 'auto')}
                className="absolute inset-0 opacity-0"
              >
                <option value="auto">{t.seccionAuto}</option>
                {CATS.map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            aria-label={t.agregar}
            className="press grid size-[52px] flex-none place-items-center rounded-full bg-accent text-accent-ink"
          >
            <Icon name="agregar" stroke={2.4} />
          </button>
        </div>
      </form>
    </>
  )
}
