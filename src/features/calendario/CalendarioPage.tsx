import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { usePersonas } from '@/app/personas'
import { usePreferencia } from '@/app/preferencias'
import { Esqueleto } from '@/components/Esqueleto'
import { Icon } from '@/components/Icon'
import { BotonIcono, Marcador, Segmentado } from '@/components/ui'
import { fila } from '@/components/estilos'
import { FilaEntrada } from '@/features/FilaEntrada'
import { colorEntrada, subtitulo, useDatosCalendario } from '@/features/entradas'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { DEFAULT_LAYERS, entriesInRange } from '@/lib/calendario'
import type { EntryKind, Layers } from '@/lib/calendario'
import {
  addDays,
  addMonths,
  fLong,
  fMonth,
  fRange,
  fTime,
  fWd3,
  parse,
  startOfMonth,
  startOfWeek,
  today,
} from '@/lib/fechas'

const t = es.calendario
type Modo = 'mes' | 'semana'
const CAPAS: EntryKind[] = ['evento', 'pendiente', 'fecha', 'ninos', 'plan', 'comida', 'google']
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const esFecha = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export function CalendarioPage() {
  const hoy = today()
  const [params] = useSearchParams()
  const [modo, setModo] = usePreferencia<Modo>('cal:modo', 'mes')
  const [guardadas, setCapas] = usePreferencia<Layers>('cal:capas', DEFAULT_LAYERS)
  const capas = { ...DEFAULT_LAYERS, ...guardadas }
  const [sel, setSel] = useState(() => (esFecha(params.get('dia')) ? params.get('dia')! : hoy))
  const { data, loading } = useDatosCalendario()

  const mover = (k: number) =>
    setSel((s) => (modo === 'mes' ? addMonths(startOfMonth(s), k) : addDays(startOfWeek(s), 7 * k)))

  const titulo =
    modo === 'mes' ? (
      <>
        <h1 className="font-display text-[30px] leading-none font-normal">{fMonth(sel)}</h1>
        <span className="text-[16px] text-muted">{sel.slice(0, 4)}</span>
      </>
    ) : (
      <h1 className="font-display text-[26px] leading-none font-normal">
        {fRange(startOfWeek(sel), addDays(startOfWeek(sel), 6))}
      </h1>
    )

  return (
    <section className="flex flex-col gap-3 pt-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 items-baseline gap-2">{titulo}</div>
        <BotonIcono icon="izquierda" label={t.anterior} onClick={() => mover(-1)} />
        <BotonIcono icon="derecha" label={t.siguiente} onClick={() => mover(1)} />
        <button
          type="button"
          onClick={() => setSel(hoy)}
          className="press h-11 rounded-[22px] border-[1.5px] border-accent px-[14px] text-[14px] font-semibold text-accent active:bg-accent-soft"
        >
          {t.hoy}
        </button>
      </div>

      <Segmentado
        label={t.vista}
        value={modo}
        onChange={setModo}
        options={[
          ['mes', t.mes],
          ['semana', t.semana],
        ]}
      />

      <div role="group" aria-label={t.capas} className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
        {CAPAS.filter((k) => k !== 'google' || (data.google?.length ?? 0) > 0).map((k) => {
          const on = capas[k]
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => setCapas({ ...capas, [k]: !on })}
              className={`flex h-11 flex-none items-center`}
            >
              <span
                className={`flex h-[34px] items-center gap-1.5 rounded-[17px] border pr-3 pl-2.5 text-[13px] font-semibold ${
                  on ? 'border-ink bg-surface text-ink' : 'border-line text-muted'
                }`}
              >
                <Marcador
                  kind={k}
                  color={on ? 'var(--ink)' : 'var(--muted)'}
                  style={{ opacity: on ? 1 : 0.6 }}
                />
                {t.capa[k]}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <Esqueleto />
      ) : modo === 'mes' ? (
        <Mes sel={sel} setSel={setSel} hoy={hoy} capas={capas} data={data} />
      ) : (
        <Semana sel={sel} hoy={hoy} capas={capas} data={data} />
      )}
    </section>
  )
}

type Datos = ReturnType<typeof useDatosCalendario>['data']

function Mes({
  sel,
  setSel,
  hoy,
  capas,
  data,
}: {
  sel: string
  setSel: (d: string) => void
  hoy: string
  capas: Layers
  data: Datos
}) {
  const p = usePersonas()
  const hojas = useHojas()
  const inicioMes = startOfMonth(sel)
  const desde = startOfWeek(inicioMes)
  const mapa = entriesInRange(data, desde, addDays(desde, 41), capas)
  const delDia = mapa.get(sel) ?? []

  return (
    <>
      {/* Tableta (768 px o más): celdas de 96 px con hasta 2 títulos y "+N más". */}
      <div
        key={`t-${inicioMes}`}
        className="fundido-rapido hidden grid-cols-7 overflow-hidden rounded-[22px] border border-line bg-surface md:grid"
      >
        {DIAS.map((d, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="grid h-8 place-items-center border-b border-tint text-[12px] font-semibold text-muted"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: 42 }, (_, n) => {
          const d = addDays(desde, n)
          const fuera = d.slice(0, 7) !== inicioMes.slice(0, 7)
          const es_ = fuera ? [] : (mapa.get(d) ?? [])
          const esHoy = d === hoy
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSel(d)}
              aria-pressed={d === sel}
              aria-label={`${fLong(d)}${es_.length ? `, ${t.elementos(es_.length)}` : ''}`}
              className={`flex h-24 min-w-0 flex-col gap-1 border-r border-b border-tint p-1.5 text-left ${fuera ? 'bg-bg' : ''}`}
            >
              <span
                className={`grid size-[30px] flex-none place-items-center rounded-full font-display text-[15px] ${
                  esHoy ? 'bg-sun text-sun-ink' : fuera ? 'text-muted' : ''
                }`}
                style={d === sel ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : undefined}
              >
                {parse(d).getUTCDate()}
              </span>
              {es_.slice(0, 2).map((e) => (
                <span
                  key={e.key}
                  className="flex min-w-0 items-center gap-1 text-[11.5px] leading-[1.2] font-semibold"
                >
                  <i
                    className="size-1.5 flex-none rounded-full"
                    style={{ background: colorEntrada(p, e) }}
                  />
                  <span className="truncate">{e.title}</span>
                </span>
              ))}
              {es_.length > 2 && (
                <span className="text-[11px] text-muted">+{es_.length - 2} más</span>
              )}
            </button>
          )
        })}
      </div>
      <div
        key={inicioMes}
        className="fundido-rapido grid grid-cols-7 gap-y-0.5 rounded-[22px] border border-line bg-surface px-1.5 pt-2.5 pb-1.5 md:hidden"
      >
        {DIAS.map((d, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="grid h-[22px] place-items-center text-[12px] font-semibold text-muted"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: 42 }, (_, n) => {
          const d = addDays(desde, n)
          const fuera = d.slice(0, 7) !== inicioMes.slice(0, 7)
          const es_ = fuera ? [] : (mapa.get(d) ?? [])
          const esHoy = d === hoy
          const elegido = d === sel
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSel(d)}
              aria-pressed={elegido}
              aria-label={`${fLong(d)}${es_.length ? `, ${t.elementos(es_.length)}` : ''}`}
              className="flex h-[52px] flex-col items-center gap-[3px]"
            >
              <span
                className={`grid size-[34px] place-items-center rounded-full font-display text-[16px] ${
                  esHoy ? 'bg-sun text-sun-ink' : fuera ? 'text-muted' : ''
                }`}
                style={elegido ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : undefined}
              >
                {parse(d).getUTCDate()}
              </span>
              <span className="flex min-h-[5px] items-center gap-0.5">
                {es_.slice(0, 4).map((e) => (
                  <i
                    key={e.key}
                    className="size-[5px] rounded-full"
                    style={{ background: colorEntrada(p, e) }}
                  />
                ))}
                {es_.length > 4 && (
                  <b className="text-[9px] leading-[5px] text-muted">+{es_.length - 4}</b>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div>
        <div className="flex items-center justify-between pt-1 pr-0.5 pb-2 pl-1">
          <h2 className="font-display text-[20px] font-normal">{fLong(sel)}</h2>
          <button
            type="button"
            onClick={() => hojas.nuevoEvento(sel)}
            className="press grid h-11 place-items-center"
          >
            <span className="flex h-10 items-center rounded-[20px] bg-accent px-[14px] text-[14px] font-semibold text-accent-ink">
              {t.nuevoEvento}
            </span>
          </button>
        </div>
        {delDia.length ? (
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute top-4 bottom-4 left-[65.25px] w-[1.5px] bg-line"
            />
            {delDia.map((e, i) => (
              <div key={e.key} className="relative -mx-[14px] pl-1">
                <FilaEntrada e={e} i={i} linea onOpen={() => hojas.abrirEntrada(e)} />
              </div>
            ))}
          </div>
        ) : (
          <p className="px-1 text-[15px] text-muted">{t.nadaDia}</p>
        )}
      </div>
    </>
  )
}

function Semana({
  sel,
  hoy,
  capas,
  data,
}: {
  sel: string
  hoy: string
  capas: Layers
  data: Datos
}) {
  const p = usePersonas()
  const hojas = useHojas()
  const desde = startOfWeek(sel)
  const mapa = entriesInRange(data, desde, addDays(desde, 6), capas)
  return (
    <div key={desde} className="fundido-rapido flex flex-col gap-3">
      {Array.from({ length: 7 }, (_, n) => {
        const d = addDays(desde, n)
        const items = mapa.get(d) ?? []
        const esHoy = d === hoy
        return (
          <div key={d} className="flex items-start gap-3">
            <div className="flex w-[46px] flex-none flex-col items-center gap-0.5 pt-2">
              <span className="text-[12px] font-bold tracking-[0.06em] text-muted uppercase">
                {fWd3(d)}
              </span>
              <span
                className={`grid size-[38px] place-items-center rounded-full font-display text-[18px] ${
                  esHoy ? 'bg-sun text-sun-ink' : ''
                }`}
              >
                {parse(d).getUTCDate()}
              </span>
              <button
                type="button"
                aria-label={t.agregarEn(fLong(d))}
                onClick={() => hojas.nuevoEvento(d)}
                className="grid size-11 place-items-center rounded-full text-accent active:bg-tint"
              >
                <Icon name="agregar" size={18} stroke={2.4} />
              </button>
            </div>
            <div className="min-w-0 flex-1 overflow-hidden rounded-[18px] border border-line bg-surface">
              {items.length ? (
                items.map((e, i) => (
                  <button
                    key={e.key}
                    type="button"
                    onClick={() => hojas.abrirEntrada(e)}
                    className={`flex min-h-[52px] w-full items-center gap-2.5 px-3 py-1.5 text-left ${fila(i)}`}
                  >
                    <Marcador kind={e.kind} color={colorEntrada(p, e)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{e.title}</span>
                      <span className="block text-[13px] text-muted">
                        {e.time ? fTime(e.time) : t.dia} · {subtitulo(e, p)}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="flex min-h-[52px] items-center px-[14px] text-[15px] text-muted">
                  —
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
