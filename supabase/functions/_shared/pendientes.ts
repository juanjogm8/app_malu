// ⚠ Copia generada por `pnpm sync:shared`. Edita el original en src/.
/* Agrupación y filtros de pendientes (criterios del prototipo). */
import type { Task } from './db.ts'
import { addDays } from './fechas.ts'
import { PRIORITY_RANK } from './listas.ts'

export type TaskFilter = 'todos' | 'mios' | 'pareja' | 'libres' | 'rutinas'

/** Una tarea sigue abierta si no está hecha; las rutinas nunca quedan hechas. */
export const isOpen = (t: Task) => !t.done || !!t.repeat

export function filterTasks(
  tasks: Task[],
  filter: TaskFilter,
  me: string | null,
  partner: string | null,
): Task[] {
  return tasks.filter((t) => {
    switch (filter) {
      case 'mios':
        return t.is_shared || (!!me && t.assignee_id === me)
      case 'pareja':
        return t.is_shared || (!!partner && t.assignee_id === partner)
      case 'libres':
        return !t.is_shared && !t.assignee_id
      case 'rutinas':
        return !!t.repeat
      default:
        return true
    }
  })
}

export type TaskGroupName = 'Atrasados' | 'Hoy' | 'Esta semana' | 'Más adelante' | 'Sin fecha'

/** Atrasados (< hoy), Hoy, Esta semana (≤ hoy+7), Más adelante, Sin fecha; y Hechos aparte. */
export function groupTasks(tasks: Task[], today: string) {
  const week = addDays(today, 7)
  const groups: Record<TaskGroupName, Task[]> = {
    Atrasados: [],
    Hoy: [],
    'Esta semana': [],
    'Más adelante': [],
    'Sin fecha': [],
  }
  for (const t of tasks.filter(isOpen)) {
    const d = t.due_date
    if (!d) groups['Sin fecha'].push(t)
    else if (d < today) groups.Atrasados.push(t)
    else if (d === today) groups.Hoy.push(t)
    else if (d <= week) groups['Esta semana'].push(t)
    else groups['Más adelante'].push(t)
  }
  const byDueThenPrio = (a: Task, b: Task) => {
    const da = a.due_date ?? '9'
    const db = b.due_date ?? '9'
    return da < db ? -1 : da > db ? 1 : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  }
  const ordered = (Object.keys(groups) as TaskGroupName[])
    .map((name) => ({ name, items: groups[name].sort(byDueThenPrio) }))
    .filter((g) => g.items.length)
  const done = tasks
    .filter((t) => t.done && !t.repeat)
    .sort((a, b) => ((b.done_on ?? '') < (a.done_on ?? '') ? -1 : 1))
  return { groups: ordered, done }
}

/** Abiertas con fecha < hoy (incluye rutinas), de la más vieja a la más nueva. */
export function overdueTasks(tasks: Task[], today: string): Task[] {
  return tasks
    .filter((t) => isOpen(t) && !!t.due_date && t.due_date < today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
}

/** Insignia de Pendientes: atrasados + los que vencen hoy. */
export function tasksBadge(tasks: Task[], today: string): number {
  return tasks.filter((t) => isOpen(t) && !!t.due_date && t.due_date <= today).length
}

/** Sugerencias del estado vacío: abren la hoja ya rellena. */
export const ROUTINE_SUGGESTIONS: [string, NonNullable<Task['repeat']>][] = [
  ['Pagar la luz', 'bimestral'],
  ['Pagar el agua', 'bimestral'],
  ['Colegiaturas', 'mensual'],
  ['Cambiar filtro de agua', 'semestral'],
  ['Servicio del coche', 'semestral'],
  ['Fumigar', 'trimestral'],
  ['Sacar la basura', 'semanal'],
]
