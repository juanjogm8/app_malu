import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import {
  Boton,
  Casilla,
  Chip,
  ChipFiltro,
  Confirmar,
  GrupoTitulo,
  PuntoPersona,
  Tarjeta,
  Vacio,
} from '@/components/ui'
import { fila } from '@/components/estilos'
import { Esqueleto } from '@/components/Esqueleto'
import { slotDe, useCompletarPendiente } from '@/features/entradas'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { fShort, today } from '@/lib/fechas'
import { filterTasks, groupTasks, isOpen, ROUTINE_SUGGESTIONS } from '@/lib/pendientes'
import type { TaskFilter } from '@/lib/pendientes'
import { whoToTask } from '@/lib/personas'
import type { WhoValue } from '@/lib/personas'
import { REPEAT_NAME, REPEATS } from '@/lib/recurrencia'
import type { Repeat } from '@/lib/recurrencia'
import { usePreferencia } from '@/app/preferencias'

const t = es.pendientes

export function PendientesPage() {
  const { rows: tasks, loading } = useRows('tasks')
  const p = usePersonas()
  const hojas = useHojas()
  const w = useEscritura()
  const [filtro, setFiltro] = usePreferencia<TaskFilter>('pendientes:filtro', 'todos')
  const [verHechos, setVerHechos] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const hoy = today()

  const lista = filterTasks(tasks, filtro, p.me?.id ?? null, p.partner?.id ?? null)
  const { groups, done } = groupTasks(lista, hoy)
  const abiertos = tasks.filter(isOpen).length

  const filtros: [TaskFilter, string][] = [
    ['todos', t.filtro.todos],
    ['mios', t.filtro.mios],
    ...(p.partner ? [['pareja', t.filtro.pareja(p.partnerName)] as [TaskFilter, string]] : []),
    ['libres', t.filtro.libres],
    ['rutinas', t.filtro.rutinas],
  ]

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-4 pt-1.5">
      <div className="flex items-baseline justify-between">
        <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
          {es.titulos.pendientes}
        </h1>
        {abiertos > 0 && <span className="text-[13px] text-muted">{t.abiertos(abiertos)}</span>}
      </div>

      <Captura />

      {loading ? (
        <Esqueleto />
      ) : !tasks.length ? (
        <Vacio
          icon="repetir"
          titulo={t.vacioTitulo}
          texto={t.vacioTexto}
          chips={ROUTINE_SUGGESTIONS.map(([n]) => n)}
          onChip={(c) => {
            const r = ROUTINE_SUGGESTIONS.find(([n]) => n === c)
            hojas.nuevoPendiente({ text: c, repeat: r?.[1] ?? '' })
          }}
        />
      ) : (
        <>
          <div
            role="group"
            aria-label={t.filtrar}
            className="-mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4"
          >
            {filtros.map(([f, l]) => (
              <ChipFiltro key={f} activo={filtro === f} onClick={() => setFiltro(f)}>
                {l}
              </ChipFiltro>
            ))}
          </div>

          {groups.map((g) => {
            const alerta = g.name === 'Atrasados'
            return (
              <div key={g.name}>
                <GrupoTitulo titulo={g.name} conteo={g.items.length} alerta={alerta} tam={22} />
                <Tarjeta tono={alerta ? 'atrasado' : 'normal'}>
                  {g.items.map((task, i) => (
                    <FilaTarea key={task.id} task={task} i={i} hoy={hoy} />
                  ))}
                </Tarjeta>
              </div>
            )
          })}
          {!groups.length && <p className="px-1 text-muted">{t.sinFiltro}</p>}

          {done.length > 0 && (
            <div className="overflow-hidden rounded-[18px] border border-line">
              <button
                type="button"
                aria-expanded={verHechos}
                onClick={() => setVerHechos((v) => !v)}
                className="flex h-[52px] w-full items-center justify-between px-4 text-muted"
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-[20px] text-ink">{t.hechos}</span>
                  <span className="text-[13px] font-bold">{done.length}</span>
                </span>
                <Icon name="abajo" size={18} className={verHechos ? 'rotate-180' : ''} />
              </button>
              {verHechos && (
                <div className="border-t border-line bg-surface">
                  {done.map((task, i) => (
                    <FilaTarea key={task.id} task={task} i={i} hoy={hoy} />
                  ))}
                  <div className="border-t border-tint p-3">
                    {confirmar ? (
                      <Confirmar
                        pregunta={t.limpiarPregunta(done.length)}
                        si={t.limpiarSi}
                        onSi={() => {
                          setConfirmar(false)
                          void w.remove('tasks', done)
                        }}
                        onNo={() => setConfirmar(false)}
                      />
                    ) : (
                      <Boton variante="enlace" chico onClick={() => setConfirmar(true)}>
                        {t.limpiar}
                      </Boton>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function FilaTarea({ task, i, hoy }: { task: Row<'tasks'>; i: number; hoy: string }) {
  const p = usePersonas()
  const hojas = useHojas()
  const completar = useCompletarPendiente()
  const hecho = task.done && !task.repeat
  const atrasada = !!task.due_date && task.due_date < hoy && !hecho
  const slot = slotDe(p, task.assignee_id, task.is_shared)

  const chips: ReactNode[] = []
  chips.push(
    slot ? (
      <Chip key="q" tono="persona" slot={slot}>
        {p.label(task.assignee_id, task.is_shared)}
      </Chip>
    ) : (
      <Chip key="q" tono="libre">
        {es.quien.sinAsignar}
      </Chip>
    ),
  )
  if (task.due_date) {
    if (atrasada)
      chips.push(
        <Chip key="f" tono="atrasado" icon="alerta">
          {t.vencio(fShort(task.due_date))}
        </Chip>,
      )
    else if (task.due_date === hoy && !hecho)
      chips.push(
        <Chip key="f" tono="pronto" icon="reloj">
          {t.hoy}
        </Chip>,
      )
    else
      chips.push(
        <Chip key="f" icon="calendario">
          {fShort(task.due_date)}
        </Chip>,
      )
  }
  if (task.repeat)
    chips.push(
      <Chip key="r" icon="repetir">
        {REPEAT_NAME[task.repeat]}
      </Chip>,
    )
  if (task.category !== 'Casa') chips.push(<Chip key="c">{task.category}</Chip>)
  if (task.priority === 'alta' && !hecho)
    chips.push(
      <Chip key="p" tono="prioridad" icon="arriba">
        {t.prioridadAlta}
      </Chip>,
    )
  if (task.repeat && task.last_done_on)
    chips.push(
      <Chip key="h" tono="hecho" icon="palomita">
        {t.hechoEl(fShort(task.last_done_on))}
      </Chip>,
    )

  return (
    <div className={`flex gap-3 px-[14px] py-3 ${fila(i)}`}>
      <Casilla checked={hecho} onChange={() => void completar(task)} label={t.marcar(task.text)} />
      <div className="flex min-w-0 flex-1 flex-col gap-[7px] pt-1">
        <button
          type="button"
          onClick={() => hojas.editarPendiente(task)}
          className={`text-left text-[16px] leading-[1.3] font-semibold ${hecho ? 'text-muted line-through' : ''}`}
        >
          {task.text}
        </button>
        <div className="flex flex-wrap gap-1.5">{chips}</div>
      </div>
    </div>
  )
}

/* ---------- Captura rápida ---------- */

function Captura() {
  const p = usePersonas()
  const w = useEscritura()
  const [texto, setTexto] = useState('')
  const [quien, setQuien] = useState<WhoValue>('')
  const [fecha, setFecha] = useState('')
  const [rep, setRep] = useState<Repeat | ''>('')

  const opcionesQuien: [WhoValue, string][] = [
    ...(p.me ? [[p.me.id, es.quien.yo] as [WhoValue, string]] : []),
    ...(p.partner ? [[p.partner.id, p.partnerName] as [WhoValue, string]] : []),
    ['both', es.quien.ambos],
    ['', es.quien.sinAsignar],
  ]
  const etiquetaQuien = quien ? (opcionesQuien.find(([v]) => v === quien)?.[1] ?? t.quien) : t.quien

  const agregar = async (e: FormEvent) => {
    e.preventDefault()
    const text = texto.trim()
    if (!text) return
    const ok = await w.insert('tasks', {
      text,
      ...whoToTask(quien),
      due_date: fecha || null,
      repeat: rep || null,
    })
    if (ok) {
      setTexto('')
      setFecha('')
      setRep('')
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
        enterKeyHint="done"
      />
      <div className="flex gap-1.5">
        <Selector
          label={t.quien}
          icono={
            <PuntoPersona
              slot={
                quien === '' ? null : slotDe(p, quien === 'both' ? null : quien, quien === 'both')
              }
              size={9}
            />
          }
          texto={etiquetaQuien}
        >
          <select
            aria-label={t.quien}
            value={quien}
            onChange={(e) => setQuien(e.target.value)}
            className="absolute inset-0 opacity-0"
          >
            {opcionesQuien.map(([v, l]) => (
              <option key={v || 'nadie'} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Selector>
        <Selector label={t.fecha} icon="calendario" texto={fecha ? fShort(fecha) : t.fecha}>
          <input
            type="date"
            aria-label={t.fecha}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="absolute inset-0 opacity-0"
          />
        </Selector>
        <Selector label={t.repetir} icon="repetir" texto={rep ? REPEAT_NAME[rep] : t.repetir}>
          <select
            aria-label={t.repetir}
            value={rep}
            onChange={(e) => setRep(e.target.value as Repeat | '')}
            className="absolute inset-0 opacity-0"
          >
            <option value="">{t.noRepite}</option>
            {REPEATS.map((r) => (
              <option key={r} value={r}>
                {REPEAT_NAME[r]}
              </option>
            ))}
          </select>
        </Selector>
        <Boton type="submit" compacto>
          {t.agregar}
        </Boton>
      </div>
    </form>
  )
}

/** Selector en --tint: un control nativo transparente encima de la etiqueta visible. */
function Selector({
  icon,
  icono,
  texto,
  children,
}: {
  label: string
  icon?: IconName
  icono?: ReactNode
  texto: string
  children: ReactNode
}) {
  return (
    <label className="relative flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-tint px-1.5 text-[14px] font-semibold focus-within:shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--focus)]">
      {icono ?? (icon && <Icon name={icon} size={15} className="flex-none" />)}
      <span className="truncate">{texto}</span>
      {children}
    </label>
  )
}
