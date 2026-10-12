/*
 * Cola de escrituras sin conexión (fase 4). Puro: tipos, reglas de conflicto y el cálculo local de
 * completar un pendiente (debe dar lo mismo que public.complete_task).
 */
import type { Member, Task } from '@/types/db'
import { nextAfter } from './recurrencia'

export type Operacion =
  | { tipo: 'insert'; tabla: string; fila: Record<string, unknown> & { id: string } }
  | { tipo: 'update'; tabla: string; id: string; patch: Record<string, unknown> }
  | { tipo: 'delete'; tabla: string; ids: string[] }
  | { tipo: 'upsert'; tabla: string; filas: (Record<string, unknown> & { id: string })[] }

export interface EnCola {
  /** Identificador de la operación */
  op_id: string
  /** Momento en que se hizo el cambio en el dispositivo (ISO) */
  ts: string
  op: Operacion
}

/** Ids de registros con cambios por enviar (para mostrar "Por enviar"). */
export function idsPendientes(cola: EnCola[]): Set<string> {
  const s = new Set<string>()
  for (const { op } of cola) {
    if (op.tipo === 'insert') s.add(op.fila.id)
    else if (op.tipo === 'update') s.add(op.id)
    else if (op.tipo === 'upsert') op.filas.forEach((f) => s.add(f.id))
  }
  return s
}

/**
 * Gana la última escritura por registro: un cambio hecho sin conexión se aplica solo si nadie más
 * cambió ese registro en el servidor después.
 */
export function debeAplicarse(
  cambioLocal: string,
  actualizadoEnServidor: string | null | undefined,
): boolean {
  if (!actualizadoEnServidor) return true
  return new Date(cambioLocal).getTime() >= new Date(actualizadoEnServidor).getTime()
}

/** Igual que public.complete_task, para completar sin conexión. */
export function completarLocal(
  t: Task,
  today: string,
  me: string | null,
  members: Pick<Member, 'id' | 'created_at'>[],
): Partial<Task> {
  if (!t.repeat) return { done: !t.done, done_on: t.done ? null : today }
  let assignee = t.assignee_id
  if (t.rotate && t.assignee_id) {
    const otra = [...members]
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .find((m) => m.id !== t.assignee_id)
    assignee = otra?.id ?? t.assignee_id
  }
  return {
    due_date: nextAfter(t.due_date ?? today, t.repeat, today),
    last_done_on: today,
    last_done_by: me,
    assignee_id: assignee,
  }
}
