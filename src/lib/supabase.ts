import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** false cuando faltan las variables de entorno; la app muestra cómo configurarlas. */
export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient<Database>(
  url || 'http://localhost:54321',
  anonKey || 'sin-configurar',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
)
