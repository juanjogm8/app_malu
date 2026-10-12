import { useRows } from '@/app/datos'
import { Esqueleto } from '@/components/Esqueleto'
import { fila } from '@/components/estilos'
import { Icon } from '@/components/Icon'
import { GrupoTitulo, Tarjeta, Vacio } from '@/components/ui'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { fShort, parse, today } from '@/lib/fechas'
import { ageAt, dateGroups, dateTitle, KIND_NAME, whenLabel } from '@/lib/fechas-importantes'
import type { DateInfo } from '@/lib/fechas-importantes'
import { TituloConAgregar } from './comun'

const t = es.fechas

export function FechasPage() {
  const { rows, loading } = useRows('important_dates')
  const hojas = useHojas()
  const grupos = dateGroups(rows, today())
  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-4">
      <TituloConAgregar titulo={t.titulo} onAgregar={() => hojas.nuevaFecha()} />
      {loading ? (
        <Esqueleto />
      ) : !rows.length ? (
        <Vacio icon="fechas" titulo={t.vacioTitulo} texto={t.vacioTexto} />
      ) : (
        grupos.map((g) => (
          <div key={g.name}>
            <GrupoTitulo
              titulo={g.name}
              conteo={g.items.length}
              alerta={g.name === 'Vencidas'}
              tam={22}
            />
            <Tarjeta tono={g.name === 'Vencidas' ? 'atrasado' : 'normal'}>
              {g.items.map((x, i) => (
                <FilaFecha key={x.item.id} x={x} i={i} onOpen={() => hojas.editarFecha(x.item)} />
              ))}
            </Tarjeta>
          </div>
        ))
      )}
    </section>
  )
}

function FilaFecha({ x, i, onOpen }: { x: DateInfo; i: number; onOpen: () => void }) {
  const edad = ageAt(x)
  const sub = [KIND_NAME[x.item.kind], edad ? es.inicio.cumple(edad) : '', x.item.notes ?? '']
    .filter(Boolean)
    .join(' · ')
  const tono =
    x.days < 0
      ? 'bg-danger-soft text-danger'
      : x.days <= x.item.remind_days
        ? 'bg-warn-soft text-warn'
        : 'bg-tint text-ink'
  const [dd, mm] = fShort(x.next).split(' ')
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-16 w-full items-center gap-3 px-[14px] py-2.5 text-left ${fila(i)}`}
    >
      <span
        className="flex w-11 flex-none flex-col items-center leading-none"
        aria-label={fShort(x.next)}
      >
        <span className="font-display text-[22px]">{dd}</span>
        <span className="mt-[3px] text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
          {mm}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{dateTitle(x.item)}</span>
        <span className="block truncate text-[13px] text-muted">{sub}</span>
      </span>
      <span
        className={`flex h-7 items-center gap-[5px] rounded-[14px] px-2.5 text-[13px] font-bold whitespace-nowrap ${tono}`}
      >
        {x.days < 0 && <Icon name="alerta" size={13} stroke={2.6} />}
        {x.days >= 0 && x.days <= x.item.remind_days && (
          <Icon name="reloj" size={13} stroke={2.6} />
        )}
        {whenLabel(x.days)}
      </span>
      <span className="sr-only">{parse(x.next).getUTCFullYear()}</span>
    </button>
  )
}
