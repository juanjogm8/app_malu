import { Navigate } from 'react-router'
import { useAuth } from '@/app/auth-context'
import { Icon } from '@/components/Icon'
import { Pantalla } from '@/components/Pantalla'
import { es } from '@/i18n/es'
import { Cargando } from './Cargando'

export function SinAccesoPage() {
  const { loading, session, member, signOut, signInWithGoogle } = useAuth()

  if (loading) return <Cargando />
  if (session && member) return <Navigate to="/" replace />
  const correo = session?.user.email

  return (
    <Pantalla>
      <div className="flex flex-1 flex-col justify-center gap-3.5 px-7 pb-20">
        <span className="grid size-16 place-items-center rounded-full bg-tint">
          <Icon name="candado" size={28} stroke={1.8} />
        </span>
        <h1 className="font-display text-[30px] leading-[1.1] font-normal">
          {es.auth.sinAccesoTitulo}
        </h1>
        <p className="text-[16px] leading-[1.5] text-muted">
          {correo && (
            <>
              {es.auth.entrasteComo} <b className="text-ink">{correo}</b>.{' '}
            </>
          )}
          {es.auth.sinAccesoTexto}
        </p>
        <button
          type="button"
          onClick={async () => {
            if (session) await signOut()
            window.history.replaceState(null, '', '/sin-acceso')
            await signInWithGoogle()
          }}
          className="press mt-2.5 h-[50px] rounded-[25px] bg-accent text-[16px] font-semibold text-accent-ink"
        >
          {es.auth.otraCuenta}
        </button>
        {session && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="press h-12 rounded-full text-[15px] font-semibold text-accent"
          >
            {es.auth.cerrarSesion}
          </button>
        )}
      </div>
    </Pantalla>
  )
}
