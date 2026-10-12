import { Navigate } from 'react-router'
import { useAuth } from '@/app/auth-context'
import { Pantalla } from '@/components/Pantalla'
import { es } from '@/i18n/es'
import { Cargando } from './Cargando'

export function SinAccesoPage() {
  const { loading, session, member, signOut, signInWithGoogle } = useAuth()

  if (loading) return <Cargando />
  if (session && member) return <Navigate to="/" replace />

  return (
    <Pantalla>
      <h1 className="text-2xl font-semibold">{es.auth.sinAccesoTitulo}</h1>
      <p className="mt-3 text-muted">{es.auth.sinAccesoTexto}</p>
      <button
        type="button"
        onClick={async () => {
          if (session) await signOut()
          window.history.replaceState(null, '', '/sin-acceso')
          await signInWithGoogle()
        }}
        className="mt-8 min-h-tap w-full rounded-md bg-accent px-4 font-medium text-accent-contrast"
      >
        {es.auth.otraCuenta}
      </button>
      {session && (
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 min-h-tap w-full rounded-md border border-border px-4 font-medium"
        >
          {es.auth.cerrarSesion}
        </button>
      )}
    </Pantalla>
  )
}
