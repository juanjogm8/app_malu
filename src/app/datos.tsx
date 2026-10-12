/* eslint-disable react-refresh/only-export-components -- proveedor y hooks van juntos */
/*
 * Capa de datos: cada tabla se lee completa (son pocos registros y dos personas) y se mantiene
 * al día con Supabase Realtime. Las escrituras son optimistas: se reflejan al instante y se
 * revierten si fallan. Sin conexión, la escritura se bloquea con un aviso (fase 1).
 */
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/app/auth-context'
import { useToast } from '@/components/Toast'
import { es } from '@/i18n/es'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

type Tables = Database['public']['Tables']
export type TableName = Exclude<keyof Tables, 'app_settings'>
export type Row<T extends TableName> = Tables[T]['Row']
export type Insert<T extends TableName> = Tables[T]['Insert']
export type Update<T extends TableName> = Tables[T]['Update']

const TABLES: TableName[] = [
  'members',
  'tasks',
  'events',
  'important_dates',
  'kid_items',
  'meals',
  'plans',
  'notes',
  'contacts',
  'shopping_items',
  'purchases',
  'home_improvements',
]

export const tableKey = (t: TableName) => ['tabla', t] as const

/**
 * Constructor de consultas sin el tipado por tabla: supabase-js no acepta el nombre de tabla como
 * parámetro genérico. Los resultados se tipan con Row<T> en cada función.
 */
const from = (t: TableName) => supabase.from(t as 'tasks')

/** Filas de una tabla (vacío mientras carga). */
export function useRows<T extends TableName>(table: T) {
  const { session } = useAuth()
  const q = useQuery({
    queryKey: tableKey(table),
    enabled: Boolean(session),
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await from(table).select('*')
      if (error) throw error
      return data as unknown as Row<T>[]
    },
  })
  return { rows: q.data ?? EMPTY, loading: q.isPending, error: q.error }
}
const EMPTY: never[] = []

type WithId = { id: string }

function applyChange(qc: QueryClient, table: TableName, p: RealtimePostgresChangesPayload<WithId>) {
  qc.setQueryData<WithId[]>(tableKey(table), (old) => {
    if (!old) return old
    if (p.eventType === 'DELETE') return old.filter((r) => r.id !== (p.old as WithId).id)
    const row = p.new as WithId
    const i = old.findIndex((r) => r.id === row.id)
    if (i === -1) return [...old, row]
    const copy = old.slice()
    copy[i] = row
    return copy
  })
}

/* ---------- Conexión ---------- */

export type Conexion = 'conectando' | 'en-vivo' | 'sin-conexion'
const ConexionContext = createContext<Conexion>('conectando')
export const useConexion = () => useContext(ConexionContext)

/** Suscribe todas las tablas a Realtime y expone el estado de conexión. */
export function DatosProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const { session } = useAuth()
  const [canal, setCanal] = useState<Conexion>('conectando')
  const [online, setOnline] = useState(() => navigator.onLine)
  const huboCorte = useRef(false)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    let ch = supabase.channel('casa')
    for (const t of TABLES) {
      ch = ch.on<WithId>('postgres_changes', { event: '*', schema: 'public', table: t }, (p) =>
        applyChange(qc, t, p),
      )
    }
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setCanal('en-vivo')
        // Al reconectar, lo que pasó durante el corte no llegó por Realtime: se vuelve a leer.
        if (huboCorte.current) void qc.invalidateQueries({ queryKey: ['tabla'] })
        huboCorte.current = false
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setCanal('sin-conexion')
        huboCorte.current = true
      }
    })
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [qc, session])

  const estado: Conexion = !online ? 'sin-conexion' : canal
  return <ConexionContext.Provider value={estado}>{children}</ConexionContext.Provider>
}

/* ---------- Escritura ---------- */

export interface Escritura {
  /** false si no hay conexión (y avisa). */
  puedeEscribir: () => boolean
  insert: <T extends TableName>(
    table: T,
    row: Insert<T> & Partial<WithId>,
  ) => Promise<Row<T> | null>
  update: <T extends TableName>(table: T, id: string, patch: Update<T>) => Promise<boolean>
  /** Elimina con aviso "Eliminado" y Deshacer (vuelve a insertar con el mismo id). */
  remove: <T extends TableName>(table: T, rows: Row<T>[], mensaje?: string) => Promise<boolean>
  completeTask: (id: string) => Promise<Row<'tasks'> | null>
}

export function useEscritura(): Escritura {
  const qc = useQueryClient()
  const conexion = useConexion()
  const toast = useToast()
  const { member } = useAuth()

  const puedeEscribir = useCallback(() => {
    if (conexion === 'sin-conexion') {
      toast.show(es.datos.sinConexion)
      return false
    }
    return true
  }, [conexion, toast])

  // Los reintentos llaman a la versión vigente de la API (evita que una función se cite a sí misma).
  const api = useRef<Escritura | null>(null)

  const fallo = useCallback(
    (reintentar?: () => void) => toast.error(es.datos.noSeGuardo, reintentar),
    [toast],
  )

  const snapshot = useCallback(
    <T extends TableName>(table: T) => qc.getQueryData<Row<T>[]>(tableKey(table)),
    [qc],
  )
  const setRows = useCallback(
    <T extends TableName>(table: T, fn: (rows: Row<T>[]) => Row<T>[]) =>
      qc.setQueryData<Row<T>[]>(tableKey(table), (old) => fn(old ?? [])),
    [qc],
  )

  const insert = useCallback<Escritura['insert']>(
    async (table, row) => {
      if (!puedeEscribir()) return null
      const now = new Date().toISOString()
      const optimista = {
        id: crypto.randomUUID(),
        created_by: member?.id ?? null,
        created_at: now,
        updated_at: now,
        ...row,
      } as unknown as Row<typeof table>
      const prev = snapshot(table)
      setRows(table, (rows) => [...rows, optimista])
      const { data, error } = await from(table)
        .insert({ ...row, id: (optimista as WithId).id } as never)
        .select()
        .single()
      if (error) {
        qc.setQueryData(tableKey(table), prev)
        fallo(() => void api.current?.insert(table, row))
        return null
      }
      const guardado = data as unknown as Row<typeof table>
      setRows(table, (rows) => rows.map((r) => ((r as WithId).id === guardado.id ? guardado : r)))
      return guardado
    },
    [puedeEscribir, member, snapshot, setRows, qc, fallo],
  )

  const update = useCallback<Escritura['update']>(
    async (table, id, patch) => {
      if (!puedeEscribir()) return false
      const prev = snapshot(table)
      setRows(table, (rows) => rows.map((r) => ((r as WithId).id === id ? { ...r, ...patch } : r)))
      const { error } = await from(table)
        .update(patch as never)
        .eq('id', id)
      if (error) {
        qc.setQueryData(tableKey(table), prev)
        fallo(() => void api.current?.update(table, id, patch))
        return false
      }
      return true
    },
    [puedeEscribir, snapshot, setRows, qc, fallo],
  )

  const restaurar = useCallback(
    async <T extends TableName>(table: T, rows: Row<T>[]) => {
      if (!puedeEscribir()) return
      setRows(table, (cur) => [...cur.filter((r) => !rows.some((x) => x.id === r.id)), ...rows])
      const { error } = await from(table).upsert(rows as never)
      if (error) {
        void qc.invalidateQueries({ queryKey: tableKey(table) })
        fallo()
      }
    },
    [puedeEscribir, setRows, qc, fallo],
  )

  const remove = useCallback<Escritura['remove']>(
    async (table, rows, mensaje) => {
      if (!rows.length || !puedeEscribir()) return false
      const ids = rows.map((r) => r.id)
      const prev = snapshot(table)
      setRows(table, (cur) => cur.filter((r) => !ids.includes((r as WithId).id)))
      const { error } = await from(table).delete().in('id', ids)
      if (error) {
        qc.setQueryData(tableKey(table), prev)
        fallo()
        return false
      }
      toast.show(mensaje ?? es.datos.eliminado, {
        action: { label: es.datos.deshacer, fn: () => void restaurar(table, rows) },
      })
      return true
    },
    [puedeEscribir, snapshot, setRows, qc, fallo, toast, restaurar],
  )

  const completeTask = useCallback<Escritura['completeTask']>(
    async (id) => {
      if (!puedeEscribir()) return null
      const { data, error } = await supabase.rpc('complete_task', { p_id: id })
      if (error) {
        fallo(() => void api.current?.completeTask(id))
        return null
      }
      setRows('tasks', (rows) => rows.map((r) => (r.id === id ? data : r)))
      return data
    },
    [puedeEscribir, fallo, setRows],
  )

  const valor = useMemo(
    () => ({ puedeEscribir, insert, update, remove, completeTask }),
    [puedeEscribir, insert, update, remove, completeTask],
  )
  useEffect(() => {
    api.current = valor
  }, [valor])
  return valor
}
