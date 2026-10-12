import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Member } from '@/types/db'

export interface AuthState {
  /** true mientras se recupera la sesión guardada o se consulta `members`. */
  loading: boolean
  session: Session | null
  /** Fila de `members` de quien inició sesión; null si la cuenta no está autorizada. */
  member: Member | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
