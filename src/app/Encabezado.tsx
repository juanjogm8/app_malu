import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '@/app/auth-context'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { es } from '@/i18n/es'
import { getThemePref, setThemePref } from '@/lib/tema'
import type { ThemePref } from '@/lib/tema'

const temas: { value: ThemePref; label: string }[] = [
  { value: 'system', label: es.menu.temaSistema },
  { value: 'light', label: es.menu.temaClaro },
  { value: 'dark', label: es.menu.temaOscuro },
]

export function Encabezado() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]">
        <span className="flex-1 truncate font-semibold">{es.app.name}</span>
        <NavLink
          to="/mas"
          className={({ isActive }) =>
            `inline-flex h-tap items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-surface-2 ${isActive ? 'text-accent' : ''}`
          }
        >
          <Icon name="mas" size={20} />
          {es.nav.mas}
        </NavLink>
        <MenuCuenta />
      </div>
    </header>
  )
}

function MenuCuenta() {
  const { member, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [tema, setTema] = useState<ThemePref>(getThemePref)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!member) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={es.menu.cuenta}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-tap items-center justify-center rounded-full hover:bg-surface-2"
      >
        <Avatar member={member} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface p-4 shadow-card">
          <p className="truncate font-semibold">{member.name}</p>
          <p className="truncate text-sm text-muted">{member.email}</p>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">{es.menu.tema}</legend>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
              {temas.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={tema === t.value}
                  onClick={() => {
                    setTema(t.value)
                    setThemePref(t.value)
                  }}
                  className={`min-h-tap rounded-sm text-sm ${tema === t.value ? 'bg-surface font-semibold shadow-card' : 'text-muted'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-4 min-h-tap w-full rounded-md border border-border text-sm font-medium hover:bg-surface-2"
          >
            {es.auth.cerrarSesion}
          </button>
        </div>
      )}
    </div>
  )
}
