import { Navigate, Outlet } from 'react-router'
import { BarraInferior } from '@/app/BarraInferior'
import { Encabezado } from '@/app/Encabezado'
import { useAuth } from '@/app/auth-context'
import { Cargando } from '@/features/auth/Cargando'

/** Layout de las vistas privadas: exige sesión y que la cuenta esté en `members`. */
export function Layout() {
  const { loading, session, member } = useAuth()
  if (loading) return <Cargando />
  if (!session) return <Navigate to="/login" replace />
  if (!member) return <Navigate to="/sin-acceso" replace />

  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Encabezado />
      <main className="mx-auto max-w-2xl pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        <Outlet />
      </main>
      <BarraInferior />
    </div>
  )
}
