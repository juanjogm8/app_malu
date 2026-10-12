import { useCallback, useMemo } from 'react'
import { useEscritura, useRows } from '@/app/datos'
import type { Row } from '@/app/datos'
import type { Personas } from '@/app/personas'
import { useToast } from '@/components/Toast'
import { fillPersona } from '@/components/estilos'
import type { QuienSlot } from '@/components/estilos'
import { es } from '@/i18n/es'
import type { CalendarData, Entry } from '@/lib/calendario'
import { KIND_LABEL } from '@/lib/calendario'
import { fShort } from '@/lib/fechas'
import { REPEAT_NAME } from '@/lib/recurrencia'

/** Persona → "a"/"b"; "Ambos" → punto partido; nadie → null. */
export function slotDe(p: Personas, personId: string | null, shared: boolean): QuienSlot {
  if (shared) return 'both'
  return p.slot(personId)
}

/** Completa un pendiente. En rutinas muestra "Listo. Próxima: 12 dic." con Deshacer. */
export function useCompletarPendiente() {
  const w = useEscritura()
  const toast = useToast()
  return useCallback(
    async (t: Row<'tasks'>) => {
      const prev = {
        due_date: t.due_date,
        last_done_on: t.last_done_on,
        last_done_by: t.last_done_by,
        assignee_id: t.assignee_id,
      }
      const r = await w.completeTask(t.id)
      if (r && t.repeat && r.due_date) {
        toast.show(es.pendientes.listoProxima(fShort(r.due_date)), {
          check: true,
          action: { label: es.datos.deshacer, fn: () => void w.update('tasks', t.id, prev) },
        })
      }
    },
    [w, toast],
  )
}

/** "Evento · Ambos", "Pendiente · Malu · Cada mes", "Niños · Emilia". */
export function subtitulo(e: Entry, p: Personas): string {
  const partes: string[] = [KIND_LABEL[e.kind]]
  if (e.kind === 'evento' || e.kind === 'pendiente' || e.kind === 'google')
    partes.push(p.label(e.personId, e.shared))
  if (e.extra) partes.push(e.extra)
  if (e.repeat) partes.push(REPEAT_NAME[e.repeat])
  return partes.join(' · ')
}

/** Todas las capas del calendario. */
export function useDatosCalendario(): { data: CalendarData; loading: boolean } {
  const events = useRows('events')
  const tasks = useRows('tasks')
  const dates = useRows('important_dates')
  const plans = useRows('plans')
  const meals = useRows('meals')
  const google = useRows('google_events')
  const data = useMemo(
    () => ({
      google: google.rows,
      events: events.rows,
      tasks: tasks.rows,
      dates: dates.rows,
      plans: plans.rows,
      meals: meals.rows,
    }),
    [events.rows, tasks.rows, dates.rows, plans.rows, meals.rows, google.rows],
  )
  const loading = [events, tasks, dates, plans, meals].some((x) => x.loading)
  return { data, loading }
}

/** Color del punto de una entrada (calendario y tira de la semana). */
export function colorEntrada(p: Personas, e: Entry): string {
  return fillPersona(slotDe(p, e.personId, e.shared))
}
