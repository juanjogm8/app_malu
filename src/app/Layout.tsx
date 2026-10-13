import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { BarraInferior } from '@/app/BarraInferior'
import { Encabezado } from '@/app/Encabezado'
import { useAuth } from '@/app/auth-context'
import { DatosProvider, useConexion } from '@/app/datos'
import { useColoresDePersona } from '@/app/personas'
import { HojaProvider } from '@/components/Hoja'
import { Icon } from '@/components/Icon'
import { ToastProvider } from '@/components/Toast'
import { Cargando } from '@/features/auth/Cargando'
import { es } from '@/i18n/es'

/** Layout de las vistas privadas: exige sesión y que la cuenta esté en `members`. */
export function Layout() {
  const { loading, session, member } = useAuth()
  const { search, hash } = useLocation()
  if (loading) return <Cargando />
  // Conserva ?error=… / #error=… del regreso de Google para que el login muestre el rechazo.
  if (!session) return <Navigate to={{ pathname: '/login', search, hash }} replace />
  if (!member) return <Navigate to="/sin-acceso" replace />

  return (
    <ToastProvider>
      <DatosProvider>
        <HojaProvider>
          <Marco />
        </HojaProvider>
      </DatosProvider>
    </ToastProvider>
  )
}

function Marco() {
  useColoresDePersona()
  const { pathname } = useLocation()
  const conexion = useConexion()
  return (
    <div className="relative min-h-dvh overflow-x-clip pb-[calc(var(--nav-h)+24px)]">
      {pathname === '/' && (
        // Único elemento decorativo: el sol que asoma en Inicio.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-[70px] -right-[60px] size-[230px] rounded-full bg-sun-soft"
        />
      )}
      {pathname.startsWith('/mas/') ? (
        <div className="pt-[env(safe-area-inset-top)]">
          <Link
            to="/mas"
            className="ml-[max(4px,env(safe-area-inset-left))] inline-flex h-11 items-center gap-1.5 pr-3 pl-2 text-[15px] font-semibold text-accent"
          >
            <Icon name="izquierda" size={22} />
            {es.nav.mas}
          </Link>
        </div>
      ) : pathname !== '/revision' ? (
        <Encabezado />
      ) : null}
      {conexion === 'sin-conexion' && (
        <div
          role="status"
          className="relative mx-4 mb-3 flex items-start gap-2.5 rounded-[16px] bg-warn-soft px-[14px] py-3 text-warn"
        >
          <Icon name="sinSenal" size={18} stroke={2.2} className="mt-px flex-none" />
          <p className="text-[14px] leading-[1.4]">
            <b>{es.conexion.avisoSinConexion}</b>{' '}
            <span className="text-ink">{es.conexion.avisoSinConexionTexto}</span>
          </p>
        </div>
      )}
      <main className="relative mx-auto max-w-[720px] px-4 pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))]">
        <Outlet />
      </main>
      <BarraInferior />
    </div>
  )
}
