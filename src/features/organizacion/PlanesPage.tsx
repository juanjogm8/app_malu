import { useState } from 'react'
import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { usePreferencia } from '@/app/preferencias'
import { Esqueleto } from '@/components/Esqueleto'
import { fila } from '@/components/estilos'
import { Icon } from '@/components/Icon'
import { ChipFiltro, Pildora, Vacio } from '@/components/ui'
import type { PildoraTono } from '@/components/ui'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { fShort } from '@/lib/fechas'
import {
  isHttpLink,
  PLAN_KIND_NAME,
  PLAN_STATUS_NAME,
  planGroups,
  surprise,
} from '@/lib/organizacion'
import type { Plan } from '@/types/db'
import { Filtros, TituloConAgregar } from './comun'

const t = es.planes
type Tipo = Plan['kind']
const TONO: Record<Plan['status'], PildoraTono> = { planeado: 'info', idea: 'tint', hecho: 'ok' }
const ESTADOS = Object.entries(PLAN_STATUS_NAME) as [Plan['status'], string][]

export function PlanesPage() {
  const { rows, loading } = useRows('plans')
  const hojas = useHojas()
  const p = usePersonas()
  const [tipo, setTipo] = usePreferencia<Tipo | null>('planes:tipo', null)
  const [idea, setIdea] = useState<string | null>(null)
  const grupos = planGroups(rows, tipo)
  const actual = rows.find((r) => r.id === idea && r.status === 'idea') ?? null
  const hayIdeas = rows.some((r) => r.status === 'idea' && (!tipo || r.kind === tipo))
  const otra = () => setIdea(surprise(rows, tipo, idea)?.id ?? null)

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-3.5">
      <TituloConAgregar
        titulo={es.titulos.planes}
        onAgregar={() => hojas.nuevoPlan(tipo ? { kind: tipo } : {})}
      />
      {loading ? (
        <Esqueleto />
      ) : !rows.length ? (
        <Vacio icon="planes" titulo={t.vacioTitulo} texto={t.vacioTexto} />
      ) : (
        <>
          <Filtros label={t.filtro}>
            <ChipFiltro activo={!tipo} onClick={() => setTipo(null)}>
              {t.todo}
            </ChipFiltro>
            {(Object.keys(PLAN_KIND_NAME) as Tipo[]).map((k) => (
              <ChipFiltro key={k} activo={tipo === k} onClick={() => setTipo(k)}>
                {PLAN_KIND_NAME[k]}
              </ChipFiltro>
            ))}
          </Filtros>

          {hayIdeas && (
            <div
              className="flex flex-col gap-2.5 rounded-[22px] bg-sun-soft p-4"
              aria-live="polite"
            >
              <button type="button" onClick={otra} className="flex items-center gap-2.5 text-left">
                <span className="grid size-9 flex-none place-items-center rounded-full bg-sun text-sun-ink">
                  <Icon name="azar" size={18} />
                </span>
                <span className="text-[15px] font-semibold">{t.sorprendeme}</span>
              </button>
              {actual && (
                <>
                  <p className="font-display text-[22px] leading-[1.2]">{actual.text}</p>
                  <p className="text-[13px] text-muted">
                    {PLAN_KIND_NAME[actual.kind]} · {t.guardadaPor(p.label(actual.created_by))}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => hojas.editarPlan(actual, { status: 'planeado' })}
                      className="press h-10 rounded-[20px] bg-ink px-4 text-[14px] font-semibold text-bg"
                    >
                      {t.planearlo}
                    </button>
                    <button
                      type="button"
                      onClick={otra}
                      className="press h-10 rounded-[20px] border-[1.5px] border-ink px-4 text-[14px] font-semibold"
                    >
                      {t.otra}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {grupos.map((g) => (
            <div key={g.status}>
              <div className="flex items-baseline gap-2 px-1 pb-2">
                <h2 className="font-display text-[22px] font-normal">{g.name}</h2>
                <span className="text-[13px] font-bold text-muted">{g.items.length}</span>
              </div>
              <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
                {g.items.map((pl, i) => (
                  <FilaPlan key={pl.id} pl={pl} i={i} />
                ))}
              </div>
            </div>
          ))}
          {!grupos.length && <p className="px-1 text-muted">{t.sinFiltro}</p>}
        </>
      )}
    </section>
  )
}

function FilaPlan({ pl, i }: { pl: Row<'plans'>; i: number }) {
  const w = useEscritura()
  const hojas = useHojas()
  const sub = [PLAN_KIND_NAME[pl.kind], pl.place, pl.date ? fShort(pl.date) : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <div className={`flex flex-col gap-2 px-[14px] py-3 ${fila(i)}`}>
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => hojas.editarPlan(pl)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`block text-[16px] font-semibold ${pl.status === 'hecho' ? 'text-muted' : ''}`}
          >
            {pl.text}
          </span>
          <span className="block text-[13px] text-muted">{sub}</span>
        </button>
        <Pildora
          label={t.estado}
          value={pl.status}
          options={ESTADOS}
          tono={TONO[pl.status]}
          onChange={(v) => void w.update('plans', pl.id, { status: v })}
        />
      </div>
      {isHttpLink(pl.link) && (
        <a
          href={pl.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-8 items-center gap-1.5 self-start text-[14px] font-semibold text-accent"
        >
          <Icon name="externo" size={15} />
          {t.abrirEnlace}
        </a>
      )}
    </div>
  )
}
