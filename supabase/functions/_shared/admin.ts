// Acceso a la base con la service_role (solo en Edge Functions; nunca en el navegador).
import { createClient } from 'npm:@supabase/supabase-js@2'
import type { CalendarData } from './calendario.ts'
import { guessCat } from './categorias.ts'
import type { AppSettings, Member, ShoppingItem } from './db.ts'
import { superDuplicate } from './listas.ts'

export function clienteAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
type Admin = ReturnType<typeof clienteAdmin>

async function todo<T>(admin: Admin, tabla: string): Promise<T[]> {
  const { data, error } = await admin.from(tabla).select('*')
  if (error) throw error
  return data as T[]
}

export async function cargarCalendario(admin: Admin): Promise<CalendarData> {
  const [events, tasks, dates, kids, plans, meals] = await Promise.all([
    todo(admin, 'events'),
    todo(admin, 'tasks'),
    todo(admin, 'important_dates'),
    todo(admin, 'kid_items'),
    todo(admin, 'plans'),
    todo(admin, 'meals'),
  ])
  return { events, tasks, dates, kids, plans, meals } as CalendarData
}

export const cargarMiembros = (admin: Admin) => todo<Member>(admin, 'members')
export const cargarSuper = (admin: Admin) => todo<ShoppingItem>(admin, 'shopping_items')

export async function cargarAjustes(admin: Admin): Promise<AppSettings | null> {
  const { data } = await admin.from('app_settings').select('*').maybeSingle()
  return (data as AppSettings | null) ?? null
}

/** Agrega al súper con sección automática y sin duplicar (igual que la app). */
export async function agregarAlSuper(admin: Admin, text: string, memberId: string) {
  const items = await cargarSuper(admin)
  const dup = superDuplicate(items, text)
  if (dup.kind === 'ya-esta') return 'ya-esta' as const
  if (dup.kind === 'volvio') {
    const { error } = await admin
      .from('shopping_items')
      .update({ done: false })
      .eq('id', dup.item.id)
    if (error) throw error
    return 'volvio' as const
  }
  const { error } = await admin
    .from('shopping_items')
    .insert({ text, category: guessCat(text), created_by: memberId })
  if (error) throw error
  return 'nuevo' as const
}
