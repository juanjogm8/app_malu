// ⚠ Copia generada por `pnpm sync:shared`. Edita el original en src/.
/*
 * Tipos de la base de datos.
 * Escritos a mano a partir de supabase/migrations. Cuando exista el proyecto de Supabase, se
 * reemplazan con los generados: `pnpm dlx supabase gen types typescript --linked > src/types/db.ts`
 */

type Repeat =
  'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
type Priority = 'alta' | 'media' | 'baja'

type Audit = {
  id: string
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Fila → definición de tabla para supabase-js. `Req` son las columnas obligatorias al insertar. */
type Table<R, Req extends keyof R = never> = {
  Row: R
  Insert: Pick<R, Req> & Partial<Omit<R, Req>>
  Update: Partial<R>
  Relationships: []
}

export type Member = {
  id: string
  email: string
  name: string
  color: string
  avatar_url: string | null
  telegram_chat_id: number | null
  created_at: string
  /** Resúmenes de Telegram (solo cuentan si app_settings.telegram_digest_per_person). */
  digest_daily: boolean
  digest_daily_hour: number
  digest_weekly: boolean
}

export type AppSettings = {
  id: boolean
  telegram_digest_per_person: boolean
  gcal_calendar_id?: string | null
  gcal_writer_id?: string | null
  updated_at: string
}

export type Task = Audit & {
  text: string
  assignee_id: string | null
  is_shared: boolean
  due_date: string | null
  priority: Priority
  category: 'Casa' | 'Pagos' | 'Coche' | 'Niños' | 'Otro'
  repeat: Repeat | null
  rotate: boolean
  notes: string | null
  done: boolean
  done_on: string | null
  last_done_on: string | null
  last_done_by: string | null
}

export type CalendarEvent = Audit & {
  title: string
  /** Paso 2 de Google Calendar: evento publicado en el calendario compartido. */
  google_event_id?: string | null
  google_etag?: string | null
  google_synced_at?: string | null
  date: string
  time: string | null
  repeat: Repeat | null
  owner_id: string | null
  is_shared: boolean
  place: string | null
  notes: string | null
  /** Niño al que corresponde (opcional): el evento aparece en la vista Niños. */
  kid?: string | null
  kid_kind?: KidKind | null
}

export type KidKind = 'cita' | 'vacuna' | 'actividad' | 'escuela' | 'fiesta' | 'otro'

/** Niños dados de alta en la vista Niños; los eventos guardan el nombre en events.kid. */
export type Kid = Audit & { name: string }

export type ImportantDate = Audit & {
  name: string
  kind: 'cumple' | 'aniversario' | 'vence' | 'otro'
  date: string
  yearly: boolean
  remind_days: 1 | 3 | 7 | 14 | 30
  notes: string | null
}

export type Meal = Audit & {
  date: string
  meal: 'desayuno' | 'comida' | 'cena'
  text: string | null
  ingredients: string | null
}

export type Plan = Audit & {
  text: string
  kind: 'restaurante' | 'finde' | 'pareja' | 'viaje' | 'otro'
  status: 'idea' | 'planeado' | 'hecho'
  date: string | null
  place: string | null
  link: string | null
  notes: string | null
}

export type Note = Audit & {
  title: string
  body: string | null
}

export type Contact = Audit & {
  name: string
  role: string | null
  phone: string | null
  notes: string | null
}

export type ShoppingCategory =
  | 'frutas'
  | 'carnes'
  | 'lacteos'
  | 'pan'
  | 'despensa'
  | 'bebidas'
  | 'congelados'
  | 'limpieza'
  | 'cuidado'
  | 'otros'

export type ShoppingItem = Audit & {
  text: string
  category: ShoppingCategory
  done: boolean
}

export type Purchase = Audit & {
  text: string
  price: number | null
  store: string | null
  priority: Priority
  done: boolean
}

export type HomeImprovement = Audit & {
  text: string
  area:
    | 'Cocina'
    | 'Baño'
    | 'Recámaras'
    | 'Sala y comedor'
    | 'Terraza o jardín'
    | 'Cochera'
    | 'Toda la casa'
  price: number | null
  status: 'idea' | 'planeado' | 'proceso' | 'listo'
}

export type GoogleAccount = {
  member_id: string
  google_email: string
  can_write: boolean
  status: 'ok' | 'error'
  last_error: string | null
  last_sync_at: string | null
  connected_at: string
}

export type GoogleEventRow = {
  id: string
  member_id: string
  calendar_id: string
  google_event_id: string
  etag: string | null
  title: string
  date: string
  time: string | null
  html_link: string | null
  updated_at: string
}

export type PushSubscriptionRow = {
  id: string
  member_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      members: Table<Member, 'id' | 'email'>
      app_settings: Table<AppSettings>
      tasks: Table<Task, 'text'>
      events: Table<CalendarEvent, 'title' | 'date'>
      kids: Table<Kid, 'name'>
      important_dates: Table<ImportantDate, 'name' | 'date'>
      meals: Table<Meal, 'date' | 'meal'>
      plans: Table<Plan, 'text'>
      notes: Table<Note, 'title'>
      contacts: Table<Contact, 'name'>
      shopping_items: Table<ShoppingItem, 'text'>
      purchases: Table<Purchase, 'text'>
      home_improvements: Table<HomeImprovement, 'text'>
      google_accounts: Table<GoogleAccount, 'member_id' | 'google_email'>
      push_subscriptions: Table<PushSubscriptionRow, 'endpoint' | 'p256dh' | 'auth'>
      google_events: Table<
        GoogleEventRow,
        'member_id' | 'calendar_id' | 'google_event_id' | 'title' | 'date'
      >
    }
    Views: { [_ in never]: never }
    Functions: {
      complete_task: { Args: { p_id: string }; Returns: Task }
      is_member: { Args: Record<string, never>; Returns: boolean }
      create_telegram_link_code: { Args: Record<string, never>; Returns: string }
      unlink_telegram: { Args: Record<string, never>; Returns: undefined }
      gcal_desconectar: { Args: Record<string, never>; Returns: undefined }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
