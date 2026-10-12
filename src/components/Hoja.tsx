/* eslint-disable react-refresh/only-export-components -- proveedor y hooks van juntos */
/*
 * Hoja de captura y edición (SPEC §8, diseño "Estados y tablet" 7.12).
 * Un solo componente con campos declarativos. Enter guarda, Escape cierra, se cierra arrastrando
 * hacia abajo y el pie (Eliminar · Cancelar · Guardar) se ancla encima del teclado.
 */
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { PuntoPersona } from '@/components/ui'
import type { QuienSlot } from '@/components/estilos'
import { es } from '@/i18n/es'

export type Valores = Record<string, string | boolean>

interface Base {
  k: string
  label: string
  /** Ocupa media fila (dos campos lado a lado). */
  mitad?: boolean
  /** Solo se muestra cuando se cumple (p. ej. el tipo de niño, si hay niño). */
  si?: (v: Valores) => boolean
}
export type Campo = Base &
  (
    | { t: 'text'; req?: boolean; ph?: string; sugerencias?: string[] }
    | { t: 'tel' }
    | { t: 'area'; rows?: number; ph?: string }
    | { t: 'date'; req?: boolean }
    | { t: 'time' }
    | { t: 'select'; opts: [string, string][] }
    | { t: 'money' }
    | { t: 'check' }
    | { t: 'who'; opts: { v: string; label: string; slot: QuienSlot }[] }
  )

export interface HojaConfig {
  titulo: string
  campos: Campo[]
  valores: Valores
  /** Devuelve false si no se pudo guardar (la hoja sigue abierta con el aviso de error). */
  onSave: (v: Valores) => Promise<boolean | void>
  onDelete?: () => void
  /** Ajusta otros campos cuando cambia uno (p. ej. tipo de fecha → avisar y anual). */
  onChange?: (k: string, v: Valores) => Valores
}

interface HojaApi {
  abrir: (c: HojaConfig) => void
  cerrar: () => void
}
const HojaContext = createContext<HojaApi | null>(null)

export function useHoja(): HojaApi {
  const ctx = useContext(HojaContext)
  if (!ctx) throw new Error('useHoja debe usarse dentro de <HojaProvider>')
  return ctx
}

export function HojaProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HojaConfig | null>(null)
  const [saliendo, setSaliendo] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  const abrir = useCallback((c: HojaConfig) => {
    opener.current = document.activeElement as HTMLElement | null
    setSaliendo(false)
    setConfig(c)
  }, [])

  const cerrar = useCallback(() => {
    setSaliendo(true)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setTimeout(
      () => {
        setConfig(null)
        setSaliendo(false)
        opener.current?.focus?.()
      },
      reduce ? 0 : 200,
    )
  }, [])

  return (
    <HojaContext.Provider value={{ abrir, cerrar }}>
      {children}
      {config && <Panel key={config.titulo} config={config} saliendo={saliendo} cerrar={cerrar} />}
    </HojaContext.Provider>
  )
}

const faltaTexto = (label: string) => `Falta: ${label.toLowerCase()}.`

function Panel({
  config,
  saliendo,
  cerrar,
}: {
  config: HojaConfig
  saliendo: boolean
  cerrar: () => void
}) {
  const [v, setV] = useState<Valores>(config.valores)
  const [falta, setFalta] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [arrastre, setArrastre] = useState(0)
  const [teclado, setTeclado] = useState(0)
  const panel = useRef<HTMLDivElement>(null)
  const inicioY = useRef<number | null>(null)
  const uid = useId()

  // Enfoca el primer campo al abrir.
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('input:not([type=checkbox]),select,textarea')?.focus()
  }, [])

  // Pie encima del teclado en pantalla.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const ajustar = () => setTeclado(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    vv.addEventListener('resize', ajustar)
    vv.addEventListener('scroll', ajustar)
    return () => {
      vv.removeEventListener('resize', ajustar)
      vv.removeEventListener('scroll', ajustar)
    }
  }, [])

  const set = (k: string, val: string | boolean) => {
    setFalta(null)
    setError(false)
    setV((prev) => {
      const next = { ...prev, [k]: val }
      return config.onChange ? config.onChange(k, next) : next
    })
  }

  const guardar = async () => {
    if (guardando) return
    const limpio: Valores = {}
    for (const [k, val] of Object.entries(v)) limpio[k] = typeof val === 'string' ? val.trim() : val
    for (const c of config.campos) {
      if ('req' in c && c.req && !limpio[c.k]) {
        setFalta(c.k)
        panel.current?.querySelector<HTMLElement>(`[data-campo="${c.k}"]`)?.focus()
        return
      }
    }
    setGuardando(true)
    const ok = await config.onSave(limpio)
    setGuardando(false)
    if (ok === false) setError(true)
    else cerrar()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      cerrar()
    } else if (
      e.key === 'Enter' &&
      e.target instanceof HTMLInputElement &&
      e.target.type !== 'checkbox'
    ) {
      e.preventDefault()
      void guardar()
    } else if (e.key === 'Tab') {
      // Mantiene el foco dentro de la hoja.
      const f = panel.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input,select,textarea',
      )
      if (!f?.length) return
      const first = f[0]!
      const last = f[f.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  // Arrastrar hacia abajo desde el asa o el título para cerrar.
  const onPointerDown = (e: React.PointerEvent) => {
    inicioY.current = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (inicioY.current !== null) setArrastre(Math.max(0, e.clientY - inicioY.current))
  }
  const onPointerUp = () => {
    if (inicioY.current === null) return
    inicioY.current = null
    if (arrastre > 100) cerrar()
    else setArrastre(0)
  }

  const filas: Campo[][] = []
  for (const c of config.campos.filter((c) => !c.si || c.si(v))) {
    const last = filas[filas.length - 1]
    if (c.mitad && last && last.length === 1 && last[0]!.mitad) last.push(c)
    else filas.push([c])
  }

  return (
    <div className="fixed inset-0 z-40" onKeyDown={onKeyDown}>
      <div
        className={`absolute inset-0 bg-scrim ${saliendo ? 'hoja-velo-out' : 'hoja-velo-in'}`}
        onClick={cerrar}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-t`}
        className={`hoja-panel absolute inset-x-0 mx-auto flex max-h-[calc(100dvh-24px)] max-w-[560px] flex-col rounded-t-[26px] bg-surface shadow-sheet md:inset-x-4 md:rounded-[26px] ${
          saliendo ? 'hoja-out' : 'hoja-in'
        }`}
        style={{
          bottom: teclado,
          transform: arrastre ? `translateY(${arrastre}px)` : undefined,
          maxHeight: teclado ? `calc(100dvh - ${teclado}px - 24px)` : undefined,
        }}
      >
        <div
          className="flex flex-none touch-none flex-col gap-3 px-4 pt-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-[5px] w-10 self-center rounded-[3px] bg-line" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 id={`${uid}-t`} className="font-display text-[22px] font-normal">
              {config.titulo}
            </h2>
            <button
              type="button"
              onClick={cerrar}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={es.hoja.cerrar}
              className="-mr-2 grid size-11 place-items-center rounded-full text-muted"
            >
              <Icon name="cerrar" size={20} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-1">
          {filas.map((fila) => (
            <div
              key={fila.map((c) => c.k).join()}
              className={fila.length > 1 ? 'grid grid-cols-[1fr_minmax(110px,40%)] gap-2.5' : ''}
            >
              {fila.map((c) => (
                <CampoUI
                  key={c.k}
                  campo={c}
                  valor={v[c.k]}
                  set={set}
                  falta={falta === c.k}
                  uid={uid}
                />
              ))}
            </div>
          ))}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-[14px] bg-danger-soft px-3 py-2.5 text-[14px] font-semibold text-danger"
            >
              <Icon name="alerta" size={16} stroke={2.4} className="flex-none" />
              {es.hoja.errorGuardar}
            </div>
          )}
        </div>

        <div
          className="mt-3 flex flex-none items-center gap-2 border-t border-tint px-4 pt-2.5"
          style={{
            paddingBottom: teclado ? 10 : 'max(18px, calc(env(safe-area-inset-bottom) + 10px))',
          }}
        >
          {config.onDelete && (
            <button
              type="button"
              onClick={() => {
                const del = config.onDelete!
                cerrar()
                del()
              }}
              className="press h-12 rounded-full px-3 text-[15px] font-semibold text-danger active:bg-danger-soft"
            >
              {es.hoja.eliminar}
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={cerrar}
            className="press h-12 rounded-full px-[14px] text-[15px] font-semibold text-accent active:bg-tint"
          >
            {es.hoja.cancelar}
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="press h-12 rounded-full bg-accent px-[22px] text-[15px] font-semibold text-accent-ink disabled:opacity-70"
          >
            {error ? es.datos.reintentar : es.hoja.guardar}
          </button>
        </div>
      </div>
    </div>
  )
}

function CampoUI({
  campo: c,
  valor,
  set,
  falta,
  uid,
}: {
  campo: Campo
  valor: string | boolean | undefined
  set: (k: string, v: string | boolean) => void
  falta: boolean
  uid: string
}) {
  const id = `${uid}-${c.k}`
  const str = typeof valor === 'string' ? valor : ''
  const err = falta ? `${id}-err` : undefined

  if (c.t === 'check') {
    return (
      <label className="flex min-h-11 items-center gap-3 text-[16px]">
        <input
          type="checkbox"
          checked={valor === true}
          onChange={(e) => set(c.k, e.target.checked)}
          className="size-5 flex-none accent-[var(--accent)]"
        />
        {c.label}
      </label>
    )
  }

  if (c.t === 'who') {
    return (
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold">{c.label}</legend>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${c.opts.length > 3 ? 2 : c.opts.length},1fr)` }}
        >
          {c.opts.map((o) => {
            const on = str === o.v
            return (
              <button
                key={o.v || 'nadie'}
                type="button"
                aria-pressed={on}
                onClick={() => set(c.k, o.v)}
                className={`press flex h-11 items-center justify-center gap-1.5 rounded-[14px] text-[15px] font-semibold ${
                  on ? 'border-2 border-ink bg-tint' : 'border border-line'
                }`}
              >
                {o.slot !== null || o.v ? (
                  <PuntoPersona slot={o.slot} size={10} />
                ) : (
                  <i className="size-2.5 rounded-full border border-dashed border-muted" />
                )}
                {o.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }

  let control: ReactNode
  const comunes = {
    id,
    'data-campo': c.k,
    'aria-invalid': falta || undefined,
    'aria-describedby': err,
    className: 'field',
  }
  if (c.t === 'area') {
    control = (
      <textarea
        {...comunes}
        rows={c.rows ?? 3}
        maxLength={2000}
        placeholder={c.ph}
        value={str}
        onChange={(e) => set(c.k, e.target.value)}
      />
    )
  } else if (c.t === 'select') {
    control = (
      <span className="relative block">
        <select
          {...comunes}
          className="field appearance-none pr-10"
          value={str}
          onChange={(e) => set(c.k, e.target.value)}
        >
          {c.opts.map(([val, l]) => (
            <option key={val} value={val}>
              {l}
            </option>
          ))}
        </select>
        <Icon
          name="abajo"
          size={16}
          stroke={2.2}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        />
      </span>
    )
  } else if (c.t === 'money') {
    control = (
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-muted">
          $
        </span>
        <input
          {...comunes}
          className="field tnum pr-14 pl-7"
          inputMode="decimal"
          value={str}
          onChange={(e) => set(c.k, e.target.value)}
        />
        <span className="pointer-events-none absolute top-1/2 right-[14px] -translate-y-1/2 text-[12px] font-bold text-muted">
          MXN
        </span>
      </span>
    )
  } else {
    const type = c.t === 'date' ? 'date' : c.t === 'time' ? 'time' : c.t === 'tel' ? 'tel' : 'text'
    const dl = c.t === 'text' && c.sugerencias?.length ? `${id}-dl` : undefined
    control = (
      <>
        <input
          {...comunes}
          className={`field ${c.t === 'time' ? 'tnum' : ''}`}
          type={type}
          maxLength={type === 'text' || type === 'tel' ? 120 : undefined}
          inputMode={c.t === 'tel' ? 'tel' : undefined}
          placeholder={c.t === 'text' ? c.ph : undefined}
          list={dl}
          value={str}
          onChange={(e) => set(c.k, e.target.value)}
        />
        {dl && c.t === 'text' && (
          <datalist id={dl}>
            {c.sugerencias!.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {c.label}
      </label>
      {control}
      {falta && (
        <span id={err} className="flex items-center gap-1.5 text-[13px] font-semibold text-danger">
          <Icon name="alerta" size={14} stroke={2.4} />
          {faltaTexto(c.label)}
        </span>
      )}
    </div>
  )
}
