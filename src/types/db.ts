/*
 * Tipos de la base de datos.
 * Escritos a mano a partir de supabase/migrations. Cuando exista el proyecto de Supabase, se
 * reemplazan con los generados: `pnpm dlx supabase gen types typescript --linked > src/types/db.ts`
 */

type Repeat =
  'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
type Priority = 'alta' | 'media' | 'baja'

interface Audit {
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

export interface Member {
  id: string
  email: string
  name: string
  color: string
  avatar_url: string | null
  telegram_chat_id: number | null
  created_at: string
}

export interface AppSettings {
  id: boolean
  telegram_digest_per_person: boolean
  updated_at: string
}

export interface Task extends Audit {
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

export interface CalendarEvent extends Audit {
  title: string
  date: string
  time: string | null
  repeat: Repeat | null
  owner_id: string | null
  is_shared: boolean
  place: string | null
  notes: string | null
}

export interface ImportantDate extends Audit {
  name: string
  kind: 'cumple' | 'aniversario' | 'vence' | 'otro'
  date: string
  yearly: boolean
  remind_days: 1 | 3 | 7 | 14 | 30
  notes: string | null
}

export interface KidItem extends Audit {
  text: string
  kind: 'cita' | 'vacuna' | 'actividad' | 'escuela' | 'fiesta' | 'otro'
  kid: string | null
  date: string | null
  time: string | null
  notes: string | null
  done: boolean
}

export interface Meal extends Audit {
  date: string
  meal: 'desayuno' | 'comida' | 'cena'
  text: string | null
  ingredients: string | null
}

export interface Plan extends Audit {
  text: string
  kind: 'restaurante' | 'finde' | 'pareja' | 'viaje' | 'otro'
  status: 'idea' | 'planeado' | 'hecho'
  date: string | null
  place: string | null
  link: string | null
  notes: string | null
}

export interface Note extends Audit {
  title: string
  body: string | null
}

export interface Contact extends Audit {
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

export interface ShoppingItem extends Audit {
  text: string
  category: ShoppingCategory
  done: boolean
}

export interface Purchase extends Audit {
  text: string
  price: number | null
  store: string | null
  priority: Priority
  done: boolean
}

export interface HomeImprovement extends Audit {
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

export type Database = {
  public: {
    Tables: {
      members: Table<Member, 'id' | 'email'>
      app_settings: Table<AppSettings>
      tasks: Table<Task, 'text'>
      events: Table<CalendarEvent, 'title' | 'date'>
      important_dates: Table<ImportantDate, 'name' | 'date'>
      kid_items: Table<KidItem, 'text'>
      meals: Table<Meal, 'date' | 'meal'>
      plans: Table<Plan, 'text'>
      notes: Table<Note, 'title'>
      contacts: Table<Contact, 'name'>
      shopping_items: Table<ShoppingItem, 'text'>
      purchases: Table<Purchase, 'text'>
      home_improvements: Table<HomeImprovement, 'text'>
    }
    Views: { [_ in never]: never }
    Functions: {
      complete_task: { Args: { p_id: string }; Returns: Task }
      is_member: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
