import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useEscritura, useRows } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { Icon } from '@/components/Icon'
import { fila } from '@/components/estilos'
import { useToast } from '@/components/Toast'
import { Marcador } from '@/components/ui'
import type { QuienSlot } from '@/components/estilos'
import { slotDe, subtitulo, useCompletarPendiente, useDatosCalendario } from '@/features/entradas'
import { useHojas } from '@/features/hojas'
import { useAgregarAlSuper } from '@/features/listas/agregarSuper'
import { es } from '@/i18n/es'
import { ALL_BUT_MEALS, entriesInRange } from '@/lib/calendario'
import type { EntryKind } from '@/lib/calendario'
import {
  addDays,
  dow,
  fDay,
  fLong,
  fShort,
  fTime,
  fWdShort,
  startOfWeek,
  today,
} from '@/lib/fechas'
import { ageAt, dateInfos, dateTitle } from '@/lib/fechas-importantes'
import { mealIngredients } from '@/lib/ingredientes'
import { plannedMeals } from '@/lib/organizacion'
import { overdueTasks } from '@/lib/pendientes'
import { norm } from '@/lib/texto'

const t = es.revision

export function RevisionPage() {
  const hoy = today()
  const navigate = useNavigate()
  const p = usePersonas()
  const w = useEscritura()
  const toast = useToast()
  const hojas = useHojas()
  const completar = useCompletarPendiente()
  const agregar = useAgregarAlSuper()
  const { data } = useDatosCalendario()
  const { rows: super_ } = useRows('shopping_items')
  const [resueltos, setResueltos] = useState(0)
  const [cerrada, setCerrada] = useState(false)

  // El domingo se planea la semana que empieza mañana; otro día, la semana en curso.
  const lunes = startOfWeek(addDays(hoy, 1))
  const tareas = overdueTasks(data.tasks, hoy)
  const viene = entriesInRange(data, hoy, addDays(hoy, 6), ALL_BUT_MEALS)
  const dias = Array.from({ length: 7 }, (_, i) => addDays(hoy, i)).filter(
    (d) => viene.get(d)?.length,
  )
  const planeadas = plannedMeals(data.meals, lunes)
  const enLista = new Set(super_.filter((i) => !i.done).map((i) => norm(i.text).trim()))
  const faltanIng = mealIngredients(data.meals, lunes, addDays(lunes, 6)).filter(
    (i) => !enLista.has(norm(i).trim()),
  )
  const faltanSuper = super_.filter((i) => !i.done).length
  const fechas = dateInfos(data.dates, hoy).filter((x) => x.days >= 0 && x.days <= 30)
  const proximaRevision = addDays(hoy, dow(hoy) === 6 ? 7 : 6 - dow(hoy))

  if (cerrada)
    return (
      <Cierre
        resumen={t.resumen(resueltos, planeadas, faltanSuper === 0 || faltanIng.length === 0)}
        proxima={fWdShort(proximaRevision).toLowerCase()}
        onVolver={() => navigate('/')}
      />
    )

  const pasarIngredientes = async () => {
    let n = 0
    for (const ing of faltanIng) if ((await agregar(ing, null, true)) === 'nuevo') n++
    toast.show(n ? es.comidas.agregados(n) : es.comidas.yaEstaban)
  }

  return (
    <section
      aria-labelledby="titulo-vista"
      className="flex flex-col gap-[18px] pt-[env(safe-area-inset-top)]"
    >
      <div className="-mx-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t.cerrar}
          className="grid size-11 place-items-center text-muted"
        >
          <Icon name="cerrar" size={20} />
        </button>
        <span className="text-[13px] font-semibold text-muted">
          {fDay(hoy)} {fShort(hoy).split(' ')[1]}
        </span>
        <span className="w-11" />
      </div>
      <div>
        <h1 id="titulo-vista" className="font-display text-[32px] leading-[1.08] font-normal">
          {es.titulos.revision}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">{t.subtitulo}</p>
      </div>

      <Paso n={1} titulo={t.atoro} actual>
        {tareas.length ? (
          <Caja>
            {tareas.map((task, i) => (
              <FilaRevision
                key={task.id}
                i={i}
                kind="pendiente"
                slot={slotDe(p, task.assignee_id, task.is_shared)}
                titulo={task.text}
                meta={`${es.inicio.vencio(fShort(task.due_date!))} · ${p.label(task.assignee_id, task.is_shared)}`}
                tarde
                onOpen={() => hojas.editarPendiente(task)}
                acciones={
                  <Acciones
                    onHecho={async () => {
                      await completar(task)
                      setResueltos((n) => n + 1)
                    }}
                    onSemana={async () => {
                      if (await w.update('tasks', task.id, { due_date: addDays(hoy, 7) }))
                        setResueltos((n) => n + 1)
                    }}
                  />
                }
              />
            ))}
          </Caja>
        ) : (
          <Nota>{t.nadaAtorado}</Nota>
        )}
      </Paso>

      <Paso n={2} titulo={t.viene}>
        {dias.length ? (
          <Caja>
            {dias
              .flatMap((d) => viene.get(d)!)
              .map((e, i) => (
                <FilaRevision
                  key={e.key}
                  i={i}
                  kind={e.kind}
                  slot={slotDe(p, e.personId, e.shared)}
                  titulo={e.title}
                  meta={[
                    fDay(e.date).replace(/^(\S{3})\S*/, '$1'),
                    e.time ? fTime(e.time) : '',
                    subtitulo(e, p).split(' · ').slice(1).join(' · '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  onOpen={() => hojas.abrirEntrada(e)}
                />
              ))}
          </Caja>
        ) : (
          <Nota>{t.nadaViene}</Nota>
        )}
        <Cta onClick={() => hojas.nuevoEvento()}>{es.calendario.nuevoEvento}</Cta>
      </Paso>

      <Paso n={3} titulo={t.comidas}>
        <Nota>{t.comidasNota(planeadas)}</Nota>
        <Cta onClick={() => navigate('/mas/comidas')}>{t.planearComidas}</Cta>
      </Paso>

      <Paso n={4} titulo={t.super}>
        <Nota>{t.superNota(faltanSuper, faltanIng.length)}</Nota>
        {faltanIng.length ? (
          <Cta onClick={() => void pasarIngredientes()}>{t.pasar(faltanIng.length)}</Cta>
        ) : (
          <Cta onClick={() => navigate('/listas/super')}>{t.abrirSuper}</Cta>
        )}
      </Paso>

      <Paso n={5} titulo={t.fechas}>
        {fechas.length ? (
          <Caja>
            {fechas.map((x, i) => {
              const edad = ageAt(x)
              return (
                <FilaRevision
                  key={x.item.id}
                  i={i}
                  kind="fecha"
                  slot="both"
                  titulo={dateTitle(x.item)}
                  meta={[fWdShort(x.next), edad ? es.inicio.cumple(edad) : '']
                    .filter(Boolean)
                    .join(' · ')}
                  onOpen={() => hojas.editarFecha(x.item)}
                />
              )
            })}
          </Caja>
        ) : (
          <Nota>{t.nadaFechas}</Nota>
        )}
      </Paso>

      <button
        type="button"
        onClick={() => setCerrada(true)}
        className="press mt-1 h-[54px] rounded-[27px] bg-sun text-[16px] font-bold text-sun-ink"
      >
        {t.listo}
      </button>
      <span className="sr-only">{fLong(hoy)}</span>
    </section>
  )
}

function Paso({
  n,
  titulo,
  actual,
  children,
}: {
  n: number
  titulo: string
  actual?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className={`grid size-9 flex-none place-items-center rounded-full border-[1.5px] font-display text-[17px] leading-none ${
          actual ? 'border-sun bg-sun text-sun-ink' : 'border-line'
        }`}
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <h2 className="font-display text-[21px] leading-[1.2] font-normal">
          <span className="sr-only">{n}. </span>
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  )
}

const Caja = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden rounded-[18px] border border-line bg-surface">{children}</div>
)
const Nota = ({ children }: { children: ReactNode }) => (
  <p className="text-[14px] text-muted">{children}</p>
)
const Cta = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="press flex h-10 items-center self-start rounded-[20px] border-[1.5px] border-accent px-4 text-[14px] font-semibold text-accent active:bg-accent-soft"
  >
    {children}
  </button>
)

function FilaRevision({
  i,
  kind,
  slot,
  titulo,
  meta,
  tarde,
  onOpen,
  acciones,
}: {
  i: number
  kind: EntryKind
  slot: QuienSlot
  titulo: string
  meta: string
  tarde?: boolean
  onOpen: () => void
  acciones?: ReactNode
}) {
  return (
    <div className={`flex flex-col gap-2 px-3 py-2.5 ${fila(i)}`}>
      <button type="button" onClick={onOpen} className="flex items-center gap-2.5 text-left">
        <Marcador kind={kind} slot={slot} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{titulo}</span>
          <span className={`block text-[13px] ${tarde ? 'text-danger' : 'text-muted'}`}>
            {meta}
          </span>
        </span>
      </button>
      {acciones}
    </div>
  )
}

function Acciones({ onHecho, onSemana }: { onHecho: () => void; onSemana: () => void }) {
  return (
    <div className="flex gap-2 pl-6">
      <button
        type="button"
        onClick={onHecho}
        className="press h-9 rounded-[18px] border-[1.5px] border-accent px-[14px] text-[14px] font-semibold text-accent"
      >
        {es.inicio.hecho}
      </button>
      <button
        type="button"
        onClick={onSemana}
        className="press h-9 rounded-[18px] bg-tint px-[14px] text-[14px] font-semibold"
      >
        {t.masSemana}
      </button>
    </div>
  )
}

function Cierre({
  resumen,
  proxima,
  onVolver,
}: {
  resumen: string
  proxima: string
  onVolver: () => void
}) {
  return (
    <section className="relative -mx-4 -mb-6 flex min-h-[calc(100dvh-var(--nav-h))] flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="sol-cierre absolute top-[150px] left-1/2 -ml-[170px] size-[340px] rounded-full bg-sun-soft"
      />
      <div
        aria-hidden="true"
        className="sol-cierre absolute top-[230px] left-1/2 -ml-[90px] size-[180px] rounded-full bg-sun"
      />
      <div className="relative flex flex-1 flex-col justify-end gap-3.5 px-6 pb-12 text-center">
        <h1 className="font-display text-[36px] leading-[1.1] font-normal">{t.enOrden}</h1>
        <p className="text-[16px] leading-[1.45] text-muted">{resumen}</p>
        <div className="mt-1.5 mb-2.5 flex justify-center">
          <span className="flex h-[30px] items-center rounded-[15px] border border-line bg-surface px-3 text-[13px] font-semibold">
            {t.proxima(proxima)}
          </span>
        </div>
        <button
          type="button"
          onClick={onVolver}
          className="press h-[52px] rounded-[26px] bg-accent text-[16px] font-semibold text-accent-ink"
        >
          {t.volver}
        </button>
      </div>
    </section>
  )
}
