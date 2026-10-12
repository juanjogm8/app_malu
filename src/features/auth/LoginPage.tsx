import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '@/app/auth-context'
import { Pantalla } from '@/components/Pantalla'
import { es } from '@/i18n/es'
import { Cargando } from './Cargando'

/**
 * Si el trigger handle_new_user rechaza el correo, Supabase regresa del OAuth con
 * `error_description` en la URL (en la búsqueda o en el hash).
 */
function oauthError(): string | null {
  const params = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return params.get('error_description') ?? hash.get('error_description')
}

export function LoginPage() {
  const { loading, session, member, signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <Cargando />
  if (session && member) return <Navigate to="/" replace />
  if (session && !member) return <Navigate to="/sin-acceso" replace />
  if (oauthError()) return <Navigate to="/sin-acceso" replace />

  const entrar = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError(es.auth.errorGenerico)
      setBusy(false)
    }
  }

  return (
    <Pantalla sol>
      <div className="flex flex-1 flex-col justify-end gap-3.5 px-6 pb-14">
        <h1 className="font-display text-[48px] leading-none font-normal">{es.app.name}</h1>
        <p className="text-[17px] leading-[1.45] text-muted">{es.auth.tagline}</p>
        <button
          type="button"
          onClick={() => void entrar()}
          disabled={busy}
          className="press mt-[18px] flex h-[54px] items-center justify-center gap-3 rounded-[27px] border border-line bg-surface text-[16px] font-semibold disabled:opacity-60"
        >
          <GoogleLogo />
          {busy ? es.auth.entrando : es.auth.entrarGoogle}
        </button>
        {error && (
          <p role="alert" className="text-center text-[14px] font-semibold text-danger">
            {error}
          </p>
        )}
        <p className="text-center text-[13px] text-muted">{es.auth.soloCuentas}</p>
        <Link
          to="/privacidad"
          className="text-center text-[13px] text-muted underline underline-offset-2"
        >
          {es.auth.privacidad}
        </Link>
      </div>
    </Pantalla>
  )
}

function GoogleLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
