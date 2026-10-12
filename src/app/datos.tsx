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
import { del, get, set } from 'idb-keyval'
import { useAuth } from '@/app/auth-context'
import { useToast } from '@/components/Toast'
import { es } from '@/i18n/es'
import { completarLocal, debeAplicarse, idsPendientes } from '@/lib/cola'
import type { EnCola, Operacion } from '@/lib/cola'
import { today } from '@/lib/fechas'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/db'

type Tables = Database['public']['Tables']
/** Tablas con `id` que la app lee completas (google_accounts se consulta aparte). */
export type TableName = Exclude<
  keyof Tables,
  'app_settings' | 'google_accounts' | 'push_subscriptions'
>
export type Row<T extends TableName> = Tables[T]['Row']
export type Insert<T extends TableName> = Tables[T]['Insert']
export type Update<T extends TableName> = Tables[T]['Update']

const TABLES: TableName[] = [
  'members',
  'tasks',
  'events',
  'important_dates',
  'meals',
  'plans',
  'notes',
  'contacts',
  'shopping_items',
  'purchases',
  'home_improvements',
  'google_events',
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
  return (
    <ConexionContext.Provider value={estado}>
      <ColaProvider conexion={estado}>{children}</ColaProvider>
    </ConexionContext.Provider>
  )
}

/* ---------- Cola de escrituras sin conexión ---------- */

const CLAVE_COLA = 'casa-en-orden:cola'

interface ColaApi {
  encolar: (op: Operacion) => void
  /** Ids con cambios por enviar ("Por enviar"). */
  pendientes: Set<string>
}
const ColaContext = createContext<ColaApi>({ encolar: () => {}, pendientes: new Set() })
export const usePorEnviar = () => useContext(ColaContext).pendientes

/** Error de red (sin señal), a diferencia de un rechazo del servidor. */
export const esErrorDeRed = (e: { message?: string; code?: string } | null) =>
  !!e && (!navigator.onLine || (!e.code && /fetch|network|load failed/i.test(e.message ?? '')))

function ColaProvider({ conexion, children }: { conexion: Conexion; children: ReactNode }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [cola, setCola] = useState<EnCola[]>([])
  const [cargada, setCargada] = useState(false)
  const enviando = useRef(false)

  useEffect(() => {
    void get<EnCola[]>(CLAVE_COLA)
      .then((c) => setCola((actual) => [...(c ?? []), ...actual]))
      .catch(() => undefined)
      .finally(() => setCargada(true))
  }, [])
  useEffect(() => {
    if (cargada) void set(CLAVE_COLA, cola).catch(() => undefined)
  }, [cola, cargada])

  const encolar = useCallback((op: Operacion) => {
    setCola((c) => [...c, { op_id: crypto.randomUUID(), ts: new Date().toISOString(), op }])
  }, [])

  // Al volver la señal se envía todo, en orden. Si una operación falla por red, se espera a la
  // siguiente reconexión; si el servidor la rechaza, se descarta y se avisa.
  useEffect(() => {
    if (conexion !== 'en-vivo' || !cargada || !cola.length || enviando.current) return
    enviando.current = true
    void (async () => {
      const hechas = new Set<string>()
      let rechazadas = 0
      for (const item of cola) {
        const r = await aplicar(item)
        if (r === 'red') break
        if (r === 'rechazada') rechazadas++
        hechas.add(item.op_id)
      }
      setCola((c) => c.filter((x) => !hechas.has(x.op_id)))
      enviando.current = false
      if (hechas.size) void qc.invalidateQueries({ queryKey: ['tabla'] })
      if (rechazadas) toast.error(es.datos.noSeEnvio(rechazadas))
    })()
  }, [conexion, cargada, cola, qc, toast])

  const valor = useMemo(() => ({ encolar, pendientes: idsPendientes(cola) }), [encolar, cola])
  return <ColaContext.Provider value={valor}>{children}</ColaContext.Provider>
}

async function aplicar({ op, ts }: EnCola): Promise<'ok' | 'red' | 'rechazada'> {
  const t = from(op.tabla as TableName)
  let error: { message?: string; code?: string } | null
  if (op.tipo === 'insert') ({ error } = await t.upsert(op.fila as never))
  else if (op.tipo === 'upsert') ({ error } = await t.upsert(op.filas as never))
  else if (op.tipo === 'delete') ({ error } = await t.delete().in('id', op.ids))
  else {
    // Gana la última escritura: si alguien cambió el registro después, el cambio local se descarta.
    const actual = await t.select('updated_at').eq('id', op.id).maybeSingle()
    if (actual.error) error = actual.error
    else if (!actual.data)
      return 'ok' // ya no existe
    else if (!debeAplicarse(ts, (actual.data as { updated_at?: string }).updated_at)) return 'ok'
    else ({ error } = await t.update(op.patch as never).eq('id', op.id))
  }
  if (!error) return 'ok'
  return esErrorDeRed(error) ? 'red' : 'rechazada'
}

/* ---------- Escritura ---------- */

export interface Escritura {
  /** Para lo que solo se puede hacer en línea (Telegram, Google): false y aviso si no hay señal. */
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
  const { encolar } = useContext(ColaContext)
  const toast = useToast()
  const { member } = useAuth()
  // Los reintentos llaman a la versión vigente de la API (evita que una función se cite a sí misma).
  const api = useRef<Escritura | null>(null)
  const sinSenal = conexion === 'sin-conexion'

  const puedeEscribir = useCallback(() => {
    if (sinSenal) {
      toast.show(es.datos.requiereConexion)
      return false
    }
    return true
  }, [sinSenal, toast])

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

  /**
   * Manda una operación: sin señal (o si la red falla a medio camino) la deja en la cola y conserva
   * el cambio optimista; si el servidor la rechaza, revierte y avisa.
   */
  const enviar = useCallback(
    async (
      op: Operacion,
      remoto: () => PromiseLike<{ error: { message?: string; code?: string } | null }>,
      revertir: () => void,
      reintentar?: () => void,
    ): Promise<boolean> => {
      if (sinSenal) {
        encolar(op)
        return true
      }
      const { error } = await remoto()
      if (!error) return true
      if (esErrorDeRed(error)) {
        encolar(op)
        return true
      }
      revertir()
      fallo(reintentar)
      return false
    },
    [sinSenal, encolar, fallo],
  )

  const insert = useCallback<Escritura['insert']>(
    async (table, row) => {
      const now = new Date().toISOString()
      const id = (row as Partial<WithId>).id ?? crypto.randomUUID()
      const optimista = {
        id,
        created_by: member?.id ?? null,
        created_at: now,
        updated_at: now,
        ...row,
      } as unknown as Row<typeof table>
      const prev = snapshot(table)
      setRows(table, (rows) => [...rows, optimista])
      const fila = { ...row, id, created_by: member?.id ?? null }
      let guardado: Row<typeof table> | null = null
      const ok = await enviar(
        { tipo: 'insert', tabla: table, fila },
        async () => {
          const r = await from(table)
            .insert(fila as never)
            .select()
            .single()
          if (!r.error) guardado = r.data as unknown as Row<typeof table>
          return r
        },
        () => qc.setQueryData(tableKey(table), prev),
        () => void api.current?.insert(table, row),
      )
      if (!ok) return null
      if (guardado) {
        const g: Row<typeof table> = guardado
        setRows(table, (rows) => rows.map((r) => ((r as WithId).id === id ? g : r)))
      }
      return guardado ?? optimista
    },
    [member, snapshot, setRows, enviar, qc],
  )

  const update = useCallback<Escritura['update']>(
    async (table, id, patch) => {
      const prev = snapshot(table)
      setRows(table, (rows) => rows.map((r) => ((r as WithId).id === id ? { ...r, ...patch } : r)))
      return enviar(
        { tipo: 'update', tabla: table, id, patch: patch as Record<string, unknown> },
        () =>
          from(table)
            .update(patch as never)
            .eq('id', id),
        () => qc.setQueryData(tableKey(table), prev),
        () => void api.current?.update(table, id, patch),
      )
    },
    [snapshot, setRows, enviar, qc],
  )

  const restaurar = useCallback(
    async <T extends TableName>(table: T, rows: Row<T>[]) => {
      setRows(table, (cur) => [...cur.filter((r) => !rows.some((x) => x.id === r.id)), ...rows])
      await enviar(
        { tipo: 'upsert', tabla: table, filas: rows as never },
        () => from(table).upsert(rows as never),
        () => void qc.invalidateQueries({ queryKey: tableKey(table) }),
      )
    },
    [setRows, enviar, qc],
  )

  const remove = useCallback<Escritura['remove']>(
    async (table, rows, mensaje) => {
      if (!rows.length) return false
      const ids = rows.map((r) => r.id)
      const prev = snapshot(table)
      setRows(table, (cur) => cur.filter((r) => !ids.includes((r as WithId).id)))
      const ok = await enviar(
        { tipo: 'delete', tabla: table, ids },
        () => from(table).delete().in('id', ids),
        () => qc.setQueryData(tableKey(table), prev),
      )
      if (!ok) return false
      toast.show(mensaje ?? es.datos.eliminado, {
        action: { label: es.datos.deshacer, fn: () => void restaurar(table, rows) },
      })
      return true
    },
    [snapshot, setRows, enviar, qc, toast, restaurar],
  )

  const completeTask = useCallback<Escritura['completeTask']>(
    async (id) => {
      const task = snapshot('tasks')?.find((t) => t.id === id)
      // Sin señal se calcula igual que complete_task y se manda como cambio normal.
      const local = async () => {
        if (!task) return null
        const members = qc.getQueryData<Row<'members'>[]>(tableKey('members')) ?? []
        const patch = completarLocal(task, today(), member?.id ?? null, members)
        return (await api.current?.update('tasks', id, patch)) ? { ...task, ...patch } : null
      }
      if (sinSenal) return local()
      const { data, error } = await supabase.rpc('complete_task', { p_id: id })
      if (error) {
        if (esErrorDeRed(error)) return local()
        fallo(() => void api.current?.completeTask(id))
        return null
      }
      setRows('tasks', (rows) => rows.map((r) => (r.id === id ? data : r)))
      return data
    },
    [snapshot, qc, member, sinSenal, fallo, setRows],
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

/** Borra la cola guardada (al cerrar sesión). */
export const borrarCola = () => del(CLAVE_COLA)
