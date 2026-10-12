import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import { usePreferencia } from '@/app/preferencias'
import { Esqueleto } from '@/components/Esqueleto'
import { fila } from '@/components/estilos'
import { Icon } from '@/components/Icon'
import { Casilla, Chip, ChipFiltro, GrupoTitulo, Tarjeta, Vacio } from '@/components/ui'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { addDays, fShort, fTime, fWdShort, today } from '@/lib/fechas'
import { KID_KIND_NAME, kidEvents, kidGroups, kidNames } from '@/lib/organizacion'
import { REPEAT_NAME } from '@/lib/recurrencia'
import type { CalendarEvent, KidItem } from '@/types/db'
import { Filtros, TituloConAgregar } from './comun'

const t = es.ninos
type Tipo = KidItem['kind']

export function NinosPage() {
  const { rows, loading } = useRows('kid_items')
  const { rows: events, loading: cargandoEventos } = useRows('events')
  const hojas = useHojas()
  const [tipo, setTipo] = usePreferencia<Tipo | null>('ninos:tipo', null)
  const [nino, setNino] = usePreferencia<string | null>('ninos:nino', null)
  const hoy = today()
  const nombres = kidNames([...rows, ...events])
  const ninoActivo = nino && nombres.includes(nino) ? nino : null
  const grupos = kidGroups(rows, hoy, tipo, ninoActivo)
  // Los eventos con niño no tienen tipo de Niños: se ven solo con el filtro "Todo".
  const eventos = tipo ? [] : kidEvents(events, hoy, ninoActivo)
  const hayEventos = events.some((e) => e.kid?.trim())

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-3.5">
      <TituloConAgregar
        titulo={es.titulos.ninos}
        onAgregar={() => hojas.nuevoNino(ninoActivo ? { kid: ninoActivo } : {})}
      />
      {loading || cargandoEventos ? (
        <Esqueleto />
      ) : !rows.length && !hayEventos ? (
        <Vacio icon="ninos" titulo={t.vacioTitulo} texto={t.vacioTexto} />
      ) : (
        <>
          <Filtros label={t.filtroTipo}>
            <ChipFiltro activo={!tipo} onClick={() => setTipo(null)}>
              {t.todo}
            </ChipFiltro>
            {(Object.keys(KID_KIND_NAME) as Tipo[]).map((k) => (
              <ChipFiltro key={k} activo={tipo === k} onClick={() => setTipo(k)}>
                {KID_KIND_NAME[k]}
              </ChipFiltro>
            ))}
          </Filtros>
          {nombres.length > 1 && (
            <Filtros label={t.filtroNino}>
              <ChipFiltro activo={!ninoActivo} onClick={() => setNino(null)}>
                {t.todos}
              </ChipFiltro>
              {nombres.map((k) => (
                <ChipFiltro key={k} activo={ninoActivo === k} onClick={() => setNino(k)}>
                  {k}
                </ChipFiltro>
              ))}
            </Filtros>
          )}
          {grupos.map((g) => (
            <div key={g.name}>
              <GrupoTitulo
                titulo={g.name}
                conteo={g.items.length}
                alerta={g.name === 'Atrasados'}
                tam={22}
              />
              <Tarjeta tono={g.name === 'Atrasados' ? 'atrasado' : 'normal'}>
                {g.items.map((k, i) => (
                  <FilaNino key={k.id} k={k} i={i} hoy={hoy} />
                ))}
              </Tarjeta>
            </div>
          ))}
          {eventos.length > 0 && (
            <div>
              <GrupoTitulo titulo={t.eventos} conteo={eventos.length} tam={22} />
              <Tarjeta>
                {eventos.map(({ event, date }, i) => (
                  <FilaEvento key={event.id} ev={event} date={date} i={i} hoy={hoy} />
                ))}
              </Tarjeta>
            </div>
          )}
          {!grupos.length && !eventos.length && <p className="px-1 text-muted">{t.sinFiltro}</p>}
        </>
      )}
    </section>
  )
}

/** Evento del calendario marcado con un niño: se abre para editar como cualquier evento. */
function FilaEvento({
  ev,
  date,
  i,
  hoy,
}: {
  ev: CalendarEvent
  date: string
  i: number
  hoy: string
}) {
  const hojas = useHojas()
  const hora = ev.time ? ` · ${fTime(ev.time)}` : ''
  return (
    <div className={`flex gap-3 px-[14px] py-3 ${fila(i)}`}>
      <span className="grid size-[30px] flex-none place-items-center text-muted" aria-hidden>
        <Icon name="calendario" size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[7px] pt-1">
        <button
          type="button"
          onClick={() => hojas.editarEvento(ev)}
          className="text-left text-[16px] leading-[1.3] font-semibold"
        >
          {ev.title}
        </button>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{t.evento}</Chip>
          {ev.kid && <Chip tono="persona">{ev.kid}</Chip>}
          {date <= addDays(hoy, 7) ? (
            <Chip tono="pronto" icon="reloj">
              {fWdShort(date)}
              {hora}
            </Chip>
          ) : (
            <Chip icon="calendario">
              {fShort(date)}
              {hora}
            </Chip>
          )}
          {ev.repeat && <Chip icon="repetir">{REPEAT_NAME[ev.repeat]}</Chip>}
        </div>
      </div>
    </div>
  )
}

function FilaNino({ k, i, hoy }: { k: Row<'kid_items'>; i: number; hoy: string }) {
  const w = useEscritura()
  const hojas = useHojas()
  const hora = k.time ? ` · ${fTime(k.time)}` : ''
  let fecha
  if (!k.date) fecha = <Chip tono="libre">{t.sinFecha}</Chip>
  else if (!k.done && k.date < hoy)
    fecha = (
      <span className="inline-flex h-[26px] items-center gap-[5px] rounded-[13px] bg-surface px-[9px] text-[12.5px] font-bold whitespace-nowrap text-danger">
        {t.vencio(fShort(k.date))}
      </span>
    )
  else if (!k.done && k.date <= addDays(hoy, 7))
    fecha = (
      <Chip tono="pronto" icon="reloj">
        {fWdShort(k.date)}
        {hora}
      </Chip>
    )
  else
    fecha = (
      <Chip icon="calendario">
        {fShort(k.date)}
        {hora}
      </Chip>
    )
  return (
    <div className={`flex gap-3 px-[14px] py-3 ${fila(i)}`}>
      <Casilla
        checked={k.done}
        onChange={() => void w.update('kid_items', k.id, { done: !k.done })}
        label={k.text}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[7px] pt-1">
        <button
          type="button"
          onClick={() => hojas.editarNino(k)}
          className={`text-left text-[16px] leading-[1.3] font-semibold ${k.done ? 'text-muted line-through' : ''}`}
        >
          {k.text}
        </button>
        <div className="flex flex-wrap gap-1.5">
          <Chip>{KID_KIND_NAME[k.kind]}</Chip>
          {k.kid && <Chip tono="persona">{k.kid}</Chip>}
          {fecha}
        </div>
      </div>
    </div>
  )
}
