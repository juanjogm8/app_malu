import { useState } from 'react'
import type { FormEvent } from 'react'
import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import { usePreferencia } from '@/app/preferencias'
import { Esqueleto } from '@/components/Esqueleto'
import { Icon } from '@/components/Icon'
import { Boton, ChipFiltro, Pildora, Tarjeta, Vacio } from '@/components/ui'
import { fila } from '@/components/estilos'
import type { PildoraTono } from '@/components/ui'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { money, parsePrice } from '@/lib/dinero'
import { AREAS, improvementGroups, STATUS_NAME, STATUS_ORDER } from '@/lib/listas'
import type { HomeImprovement } from '@/types/db'

const t = es.casa
type Area = HomeImprovement['area']
type Estado = HomeImprovement['status']
const TONO: Record<Estado, PildoraTono> = {
  idea: 'tint',
  planeado: 'info',
  proceso: 'warn',
  listo: 'ok',
}
const ESTADOS: [Estado, string][] = STATUS_ORDER.map((s) => [s, STATUS_NAME[s]])

/** Casa: proyectos puntuales de la casa (lo que se repite sigue en Pendientes). */
export function CasaPage() {
  const { rows, loading } = useRows('home_improvements')
  const [area, setArea] = usePreferencia<Area | null>('casa:area', null)
  const { groups, open, estimate, done } = improvementGroups(rows, area)
  const resumen = improvementGroups(rows, null)

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-4 pt-1.5">
      <div>
        <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
          {es.titulos.casa}
        </h1>
        {rows.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="flex h-7 items-center rounded-[14px] bg-tint px-2.5 text-[13px] font-semibold">
              {t.porHacer(open)}
            </span>
            {estimate > 0 && (
              <span className="tnum flex h-7 items-center rounded-[14px] bg-tint px-2.5 text-[13px] font-semibold">
                {t.estimado(money(estimate))}
              </span>
            )}
            {done > 0 && (
              <span className="flex h-7 items-center gap-1 rounded-[14px] bg-ok-soft px-2.5 text-[13px] font-bold text-ok">
                <Icon name="palomita" size={12} stroke={3} />
                {t.listas(done)}
              </span>
            )}
          </div>
        )}
      </div>

      <Captura area={area} />

      {loading ? (
        <Esqueleto />
      ) : !rows.length ? (
        <Vacio icon="casa" titulo={t.vacioTitulo} texto={t.vacioTexto} />
      ) : (
        <>
          <div
            role="group"
            aria-label={t.filtrar}
            className="-mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4"
          >
            <ChipFiltro activo={!area} onClick={() => setArea(null)}>
              {t.todas}
            </ChipFiltro>
            {AREAS.filter((a) => resumen.groups.some((g) => g.items.some((i) => i.area === a))).map(
              (a) => (
                <ChipFiltro key={a} activo={area === a} onClick={() => setArea(a)}>
                  {a}
                </ChipFiltro>
              ),
            )}
          </div>
          {groups.map((g) => (
            <div key={g.status}>
              <div className="flex items-baseline gap-2 px-1 pb-2">
                <h2 className="font-display text-[22px] font-normal">{g.name}</h2>
                <span className="text-[13px] font-bold text-muted">{g.items.length}</span>
              </div>
              <Tarjeta>
                {g.items.map((m, i) => (
                  <FilaMejora key={m.id} m={m} i={i} />
                ))}
              </Tarjeta>
            </div>
          ))}
          {!groups.length && <p className="px-1 text-muted">{t.sinFiltro}</p>}
        </>
      )}
    </section>
  )
}

function FilaMejora({ m, i }: { m: Row<'home_improvements'>; i: number }) {
  const w = useEscritura()
  const hojas = useHojas()
  return (
    <div className={`flex min-h-[62px] items-center gap-3 py-2.5 pr-3 pl-4 ${fila(i)}`}>
      <button
        type="button"
        onClick={() => hojas.editarMejora(m)}
        className="min-w-0 flex-1 text-left"
      >
        <span
          className={`block text-[16px] font-semibold ${m.status === 'listo' ? 'line-through' : ''}`}
        >
          {m.text}
        </span>
        <span className="block text-[13px] text-muted">
          {m.area}
          {m.price != null && (
            <>
              {' · '}
              <span className="tnum">{money(m.price)}</span>
            </>
          )}
        </span>
      </button>
      <Pildora
        label={t.estado}
        value={m.status}
        options={ESTADOS}
        tono={TONO[m.status]}
        onChange={(v) => void w.update('home_improvements', m.id, { status: v })}
      />
    </div>
  )
}

function Captura({ area: filtro }: { area: Area | null }) {
  const w = useEscritura()
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState<Area>(filtro ?? 'Toda la casa')
  const [costo, setCosto] = useState('')

  const agregar = async (e: FormEvent) => {
    e.preventDefault()
    const text = texto.trim()
    if (!text) return
    const ok = await w.insert('home_improvements', {
      text,
      area,
      price: parsePrice(costo),
      status: 'idea',
    })
    if (ok) {
      setTexto('')
      setCosto('')
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
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        maxLength={120}
      />
      <div className="grid grid-cols-[1fr_104px_auto] gap-2">
        <span className="relative">
          <select
            className="field appearance-none truncate pr-9"
            aria-label={t.area}
            value={area}
            onChange={(e) => setArea(e.target.value as Area)}
          >
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
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
        <Boton type="submit" compacto>
          {t.agregar}
        </Boton>
      </div>
    </form>
  )
}
