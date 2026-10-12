import { Link, useNavigate } from 'react-router'
import { useRows } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { Esqueleto } from '@/components/Esqueleto'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { Boton, GrupoTitulo, Marcador, Tarjeta } from '@/components/ui'
import { fila } from '@/components/estilos'
import { FilaEntrada } from '@/features/FilaEntrada'
import {
  colorEntrada,
  slotDe,
  useCompletarPendiente,
  useDatosCalendario,
} from '@/features/entradas'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { ALL_BUT_MEALS, entriesInRange } from '@/lib/calendario'
import type { Entry } from '@/lib/calendario'
import { addDays, fDay, fLong, fShort, fWdShort, parse, startOfWeek, today } from '@/lib/fechas'
import { ageAt, dateInfos, dateTitle, isApproaching, whenLabel } from '@/lib/fechas-importantes'
import { firstName } from '@/lib/personas'
import { overdueTasks } from '@/lib/pendientes'

const t = es.inicio
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function InicioPage() {
  const p = usePersonas()
  const hoy = today()
  const { data, loading } = useDatosCalendario()
  const { rows: super_ } = useRows('shopping_items')
  const { rows: compras } = useRows('purchases')
  const { rows: mejoras } = useRows('home_improvements')
  const { rows: notas } = useRows('notes')
  const { rows: contactos } = useRows('contacts')

  const saludo = (
    <div>
      <h1 className="font-display text-[38px] leading-[1.05] font-normal tracking-[-0.01em]">
        {t.hola(p.me ? firstName(p.me) : '')}
      </h1>
      <p className="mt-1.5 text-[15px] text-muted">{fLong(hoy)}</p>
    </div>
  )

  if (loading)
    return (
      <div className="flex flex-col gap-[18px] pt-2.5">
        {saludo}
        <Esqueleto />
      </div>
    )

  const vacio =
    !super_.length &&
    !compras.length &&
    !mejoras.length &&
    !notas.length &&
    !contactos.length &&
    Object.values(data).every((l) => !l.length)
  if (vacio)
    return (
      <div className="flex flex-col gap-[22px] pt-2.5">
        {saludo}
        <PrimerUso />
      </div>
    )

  return (
    <div className="flex flex-col gap-[18px] pt-2.5">
      {saludo}
      <Contenido hoy={hoy} />
    </div>
  )
}

function Contenido({ hoy }: { hoy: string }) {
  const p = usePersonas()
  const hojas = useHojas()
  const navigate = useNavigate()
  const completar = useCompletarPendiente()
  const { data } = useDatosCalendario()
  const { rows: super_ } = useRows('shopping_items')
  const { rows: compras } = useRows('purchases')
  const { rows: mejoras } = useRows('home_improvements')

  // La tira de la semana empieza el lunes; Próximos 7 días llega a hoy + 7 (siempre después del domingo).
  const lunes = startOfWeek(hoy)
  const mapa = entriesInRange(data, lunes, addDays(hoy, 7), ALL_BUT_MEALS)
  const proximos = Array.from({ length: 7 }, (_, k) => addDays(hoy, k + 1)).filter(
    (d) => mapa.get(d)?.length,
  )
  const deHoy = mapa.get(hoy) ?? []
  const atrasados = overdueTasks(data.tasks, hoy)
  const fechas = dateInfos(data.dates, hoy).filter(isApproaching)
  const tareaDe = (e: Entry) => data.tasks.find((x) => x.id === e.id)

  const atajos: { label: string; n: number; to: string }[] = [
    { label: es.titulos.super, n: super_.filter((i) => !i.done).length, to: '/listas/super' },
    { label: es.titulos.compras, n: compras.filter((i) => !i.done).length, to: '/listas/compras' },
    { label: 'Mejoras', n: mejoras.filter((i) => i.status !== 'listo').length, to: '/casa' },
  ]

  return (
    <>
      {/* Tira de la semana */}
      <div className="grid grid-cols-7 gap-1">
        {DIAS.map((d, i) => {
          const dia = addDays(lunes, i)
          const esHoy = dia === hoy
          const puntos = (mapa.get(dia) ?? []).slice(0, 3)
          return (
            <button
              key={dia}
              type="button"
              onClick={() => navigate(`/calendario?dia=${dia}`)}
              aria-label={`${fLong(dia)}${puntos.length ? `, ${es.calendario.elementos((mapa.get(dia) ?? []).length)}` : ''}`}
              className="flex flex-col items-center gap-[5px]"
            >
              <span className="text-[11px] font-semibold text-muted">{d}</span>
              <span
                className={`grid size-10 place-items-center rounded-full border-[1.5px] font-display text-[17px] ${
                  esHoy ? 'border-sun bg-sun text-sun-ink' : 'border-line bg-surface'
                }`}
              >
                {parse(dia).getUTCDate()}
              </span>
              <span className="flex min-h-[5px] gap-0.5">
                {puntos.map((e) => (
                  <i
                    key={e.key}
                    className="size-[5px] rounded-full"
                    style={{ background: colorEntrada(p, e) }}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      {/* Atajos */}
      <div className="grid grid-cols-3 overflow-hidden rounded-[18px] border border-line bg-surface">
        {atajos.map((a, i) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex min-h-[52px] items-center justify-between px-[14px] active:bg-tint ${i ? 'border-l border-line' : ''}`}
          >
            <span className="text-[14px] font-semibold">{a.label}</span>
            <span className="font-display text-[22px] leading-none text-accent">{a.n}</span>
          </Link>
        ))}
      </div>

      <Boton variante="secundario" className="w-full" onClick={() => navigate('/revision')}>
        <Icon name="revision" size={18} />
        {t.revision}
      </Boton>

      {/* Hoy */}
      <div>
        <GrupoTitulo titulo={t.hoy} conteo={deHoy.length} />
        <Tarjeta>
          {deHoy.length ? (
            deHoy.map((e, i) => {
              const tarea = e.kind === 'pendiente' ? tareaDe(e) : undefined
              return (
                <FilaEntrada
                  key={e.key}
                  e={e}
                  i={i}
                  onOpen={() => hojas.abrirEntrada(e)}
                  accion={tarea && <BotonHecho onClick={() => void completar(tarea)} />}
                />
              )
            })
          ) : (
            <p className="px-[14px] py-4 text-[15px] text-muted">{t.nadaHoy}</p>
          )}
        </Tarjeta>
      </div>

      {/* Atrasados */}
      {atrasados.length > 0 && (
        <div>
          <GrupoTitulo titulo={t.atrasados} conteo={atrasados.length} alerta />
          <Tarjeta tono="atrasado">
            {atrasados.map((task, i) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-[14px] py-3 ${i ? 'border-t border-[color-mix(in_oklab,var(--danger)_18%,transparent)]' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => hojas.editarPendiente(task)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Marcador kind="pendiente" slot={slotDe(p, task.assignee_id, task.is_shared)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{task.text}</span>
                    <span className="block text-[13px] font-semibold text-danger">
                      {t.vencio(fShort(task.due_date!))} ·{' '}
                      {p.label(task.assignee_id, task.is_shared)}
                    </span>
                  </span>
                </button>
                <BotonHecho fondo onClick={() => void completar(task)} />
              </div>
            ))}
          </Tarjeta>
        </div>
      )}

      {/* Próximos 7 días */}
      <div>
        <GrupoTitulo titulo={t.proximos} />
        <Tarjeta>
          {proximos.map((d, gi) => (
            <div key={d} className={gi ? 'border-t border-tint' : ''}>
              <div className="eyebrow px-[14px] pt-3 pb-0.5 text-muted">{fDay(d)}</div>
              {mapa.get(d)!.map((e) => (
                <FilaEntrada key={e.key} e={e} i={0} onOpen={() => hojas.abrirEntrada(e)} />
              ))}
            </div>
          ))}
          {!proximos.length && (
            <p className="px-[14px] py-4 text-[15px] text-muted">{t.nadaProximo}</p>
          )}
        </Tarjeta>
      </div>

      {/* Fechas que se acercan */}
      {fechas.length > 0 && (
        <div>
          <GrupoTitulo titulo={t.fechas} />
          <Tarjeta>
            {fechas.map((x, i) => {
              const edad = ageAt(x)
              const sub =
                x.item.kind === 'vence'
                  ? t.vence(fWdShort(x.next).toLowerCase())
                  : [fWdShort(x.next), edad ? t.cumple(edad) : ''].filter(Boolean).join(' · ')
              const pronto = x.days <= 7
              return (
                <button
                  key={x.item.id}
                  type="button"
                  onClick={() => hojas.editarFecha(x.item)}
                  className={`flex min-h-[58px] w-full items-center gap-3 px-[14px] py-2.5 text-left ${fila(i)}`}
                >
                  <Marcador kind="fecha" slot="both" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{dateTitle(x.item)}</span>
                    <span className="block text-[13px] text-muted">{sub}</span>
                  </span>
                  <span
                    className={`flex h-7 items-center gap-[5px] rounded-[14px] px-2.5 text-[13px] font-bold whitespace-nowrap ${
                      pronto ? 'bg-warn-soft text-warn' : 'bg-tint text-ink'
                    }`}
                  >
                    <Icon name="reloj" size={13} stroke={2.6} />
                    {whenLabel(x.days)}
                  </span>
                </button>
              )
            })}
          </Tarjeta>
        </div>
      )}
    </>
  )
}

function BotonHecho({ onClick, fondo }: { onClick: () => void; fondo?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press -my-1 grid h-11 flex-none place-items-center"
    >
      <span
        className={`flex h-9 items-center rounded-[18px] px-[14px] text-[14px] font-semibold text-accent ${
          fondo ? 'bg-surface' : 'border-[1.5px] border-accent active:bg-accent-soft'
        }`}
      >
        {t.hecho}
      </span>
    </button>
  )
}

function PrimerUso() {
  const navigate = useNavigate()
  const hojas = useHojas()
  const opciones: { titulo: string; sub: string; icon: IconName; fn: () => void }[] = [
    {
      titulo: t.starterSuper,
      sub: t.starterSuperSub,
      icon: 'listas',
      fn: () => navigate('/listas/super'),
    },
    {
      titulo: t.starterRutina,
      sub: t.starterRutinaSub,
      icon: 'repetir',
      fn: () => hojas.nuevoPendiente({ text: 'Pagar la luz', repeat: 'bimestral' }),
    },
    {
      titulo: t.starterEvento,
      sub: t.starterEventoSub,
      icon: 'calendario',
      fn: () => hojas.nuevoEvento(),
    },
  ]
  return (
    <div className="flex flex-col gap-1.5 rounded-[22px] border border-line bg-surface px-[18px] pt-[22px] pb-2.5">
      <span aria-hidden="true" className="mb-2 size-[52px] rounded-full bg-sun" />
      <h2 className="font-display text-[26px] leading-[1.15] font-normal">{t.empiecen}</h2>
      <p className="mb-2 text-[15px] leading-[1.45] text-muted">{t.empiecenTexto}</p>
      {opciones.map((o) => (
        <button
          key={o.titulo}
          type="button"
          onClick={o.fn}
          className="flex min-h-[60px] items-center gap-3.5 border-t border-tint text-left"
        >
          <span className="grid size-10 flex-none place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name={o.icon} size={20} />
          </span>
          <span className="flex-1">
            <span className="block text-[16px] font-semibold">{o.titulo}</span>
            <span className="block text-[13px] text-muted">{o.sub}</span>
          </span>
          <Icon name="derecha" size={18} className="text-muted" />
        </button>
      ))}
    </div>
  )
}
