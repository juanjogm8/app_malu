import { useRows } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { usePreferencia } from '@/app/preferencias'
import { Esqueleto } from '@/components/Esqueleto'
import { fila } from '@/components/estilos'
import { Boton, Chip, ChipFiltro, GrupoTitulo, Marcador, Tarjeta, Vacio } from '@/components/ui'
import { slotDe } from '@/features/entradas'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { addDays, fShort, fTime, fWdShort, today } from '@/lib/fechas'
import { KID_KIND_NAME, kidView } from '@/lib/organizacion'
import type { EventoNino } from '@/lib/organizacion'
import { REPEAT_NAME } from '@/lib/recurrencia'
import type { KidKind } from '@/types/db'
import { Filtros, TituloConAgregar } from './comun'

const t = es.ninos

/** Niños: vista de los eventos del calendario que tienen niño. */
export function NinosPage() {
  const { rows: events, loading } = useRows('events')
  const { rows: kids, loading: cargandoNinos } = useRows('kids')
  const hojas = useHojas()
  const [tipo, setTipo] = usePreferencia<KidKind | null>('ninos:tipo', null)
  const [nino, setNino] = usePreferencia<string | null>('ninos:nino', null)
  const hoy = today()
  const ordenados = [...kids].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const kidActivo = ordenados.find((k) => k.name === nino) ?? null
  const ninoActivo = kidActivo?.name ?? null
  const { proximos, pasados } = kidView(events, hoy, ninoActivo, tipo)

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-3.5">
      <TituloConAgregar
        titulo={es.titulos.ninos}
        // Un evento nuevo con el niño (y el tipo) del filtro ya puestos.
        // Sin niños dados de alta, primero se agrega uno.
        onAgregar={() =>
          ordenados.length
            ? hojas.nuevoEvento(undefined, {
                kid: ninoActivo ?? (ordenados.length === 1 ? ordenados[0]!.name : ''),
                kid_kind: tipo ?? '',
              })
            : hojas.nuevoNino(setNino)
        }
      />
      {loading || cargandoNinos ? (
        <Esqueleto />
      ) : !ordenados.length ? (
        <Vacio
          icon="ninos"
          titulo={t.vacioTitulo}
          texto={t.vacioTexto}
          chips={[t.agregarNino]}
          onChip={() => hojas.nuevoNino(setNino)}
        />
      ) : (
        <>
          <Filtros label={t.filtroNino}>
            {ordenados.length > 1 && (
              <ChipFiltro activo={!ninoActivo} onClick={() => setNino(null)}>
                {t.todos}
              </ChipFiltro>
            )}
            {ordenados.map((k) => (
              <ChipFiltro
                key={k.id}
                activo={ninoActivo === k.name}
                onClick={() => setNino(ninoActivo === k.name ? null : k.name)}
              >
                {k.name}
              </ChipFiltro>
            ))}
            <ChipFiltro activo={false} onClick={() => hojas.nuevoNino(setNino)}>
              {t.agregarNino}
            </ChipFiltro>
          </Filtros>
          {kidActivo && (
            <Boton
              variante="enlace"
              chico
              className="self-start"
              onClick={() => hojas.editarNino(kidActivo, setNino)}
            >
              {t.editarNino(kidActivo.name)}
            </Boton>
          )}
          <Filtros label={t.filtroTipo}>
            <ChipFiltro activo={!tipo} onClick={() => setTipo(null)}>
              {t.todo}
            </ChipFiltro>
            {(Object.keys(KID_KIND_NAME) as KidKind[]).map((k) => (
              <ChipFiltro key={k} activo={tipo === k} onClick={() => setTipo(k)}>
                {KID_KIND_NAME[k]}
              </ChipFiltro>
            ))}
          </Filtros>
          {[
            { titulo: t.proximos, items: proximos },
            { titulo: t.pasaron, items: pasados },
          ]
            .filter((g) => g.items.length)
            .map((g) => (
              <div key={g.titulo}>
                <GrupoTitulo titulo={g.titulo} conteo={g.items.length} tam={22} />
                <Tarjeta>
                  {g.items.map((x, i) => (
                    <FilaEvento key={x.event.id} x={x} i={i} hoy={hoy} />
                  ))}
                </Tarjeta>
              </div>
            ))}
          {!proximos.length && !pasados.length && <p className="px-1 text-muted">{t.sinFiltro}</p>}
        </>
      )}
    </section>
  )
}

function FilaEvento({ x: { event: ev, date }, i, hoy }: { x: EventoNino; i: number; hoy: string }) {
  const hojas = useHojas()
  const p = usePersonas()
  const hora = ev.time ? ` · ${fTime(ev.time)}` : ''
  const pasado = date < hoy
  return (
    <button
      type="button"
      onClick={() => hojas.editarEvento(ev)}
      className={`flex w-full gap-3 px-[14px] py-3 text-left ${fila(i)}`}
    >
      <span className="grid h-[22px] w-4 flex-none place-items-center">
        <Marcador kind="evento" slot={slotDe(p, ev.owner_id, ev.is_shared)} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
        <span className={`text-[16px] leading-[1.3] font-semibold ${pasado ? 'text-muted' : ''}`}>
          {ev.title}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {ev.kid && <Chip tono="persona">{ev.kid}</Chip>}
          {ev.kid_kind && <Chip>{KID_KIND_NAME[ev.kid_kind]}</Chip>}
          {!pasado && date <= addDays(hoy, 7) ? (
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
        </span>
      </span>
    </button>
  )
}
