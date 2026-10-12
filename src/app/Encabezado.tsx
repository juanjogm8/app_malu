import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '@/app/auth-context'
import { useConexion, useEscritura } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { Segmentado } from '@/components/ui'
import { es } from '@/i18n/es'
import { coloresPermitidos, PALETA } from '@/lib/personas'
import { getThemePref, setThemePref } from '@/lib/tema'
import type { ThemePref } from '@/lib/tema'

export function Encabezado() {
  return (
    <header className="relative pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-[52px] max-w-[720px] items-center gap-2.5 pr-[max(10px,env(safe-area-inset-right))] pl-[max(18px,env(safe-area-inset-left))]">
        <span className="flex-1 truncate font-display text-[17px]">{es.app.name}</span>
        <EstadoConexion />
        <NavLink
          to="/mas"
          aria-label={es.nav.mas}
          className={({ isActive }) =>
            `press grid size-11 place-items-center rounded-full ${isActive ? 'text-accent' : 'text-ink'} active:bg-tint`
          }
        >
          <Icon name="mas" size={22} />
        </NavLink>
        <MenuCuenta />
      </div>
    </header>
  )
}

function EstadoConexion() {
  const c = useConexion()
  if (c === 'sin-conexion')
    return (
      <span className="flex items-center gap-[5px] text-[12px] font-bold whitespace-nowrap text-warn">
        <Icon name="sinSenal" size={14} stroke={2.4} />
        {es.conexion.sinConexion}
      </span>
    )
  return (
    <span
      role="status"
      className="flex items-center gap-[5px] text-[12px] whitespace-nowrap text-muted"
    >
      <i className={`size-2 rounded-full ${c === 'en-vivo' ? 'bg-ok' : 'bg-line'}`} />
      {c === 'en-vivo' ? es.conexion.enVivo : es.conexion.conectando}
    </span>
  )
}

const temas: [ThemePref, string][] = [
  ['system', es.menu.temaSistema],
  ['light', es.menu.temaClaro],
  ['dark', es.menu.temaOscuro],
]

function MenuCuenta() {
  const { member, signOut } = useAuth()
  const p = usePersonas()
  const w = useEscritura()
  const [open, setOpen] = useState(false)
  const [tema, setTema] = useState<ThemePref>(getThemePref)
  const ref = useRef<HTMLDivElement>(null)
  const yo = p.me ? (p.byId(p.me.id) ?? p.me) : null

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!member || !yo) return null
  const permitidos = coloresPermitidos(p.partner?.color)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={es.menu.cuenta}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-full"
      >
        <Avatar member={yo} slot={p.slot(yo.id)} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[290px] rounded-[18px] border border-line bg-surface p-4 shadow-toast">
          <p className="truncate font-semibold">{yo.name}</p>
          <p className="truncate text-[13px] text-muted">{yo.email}</p>

          <p className="mt-4 mb-2 text-[13px] font-semibold">{es.menu.tema}</p>
          <Segmentado
            chico
            label={es.menu.tema}
            value={tema}
            options={temas}
            onChange={(v) => {
              setTema(v)
              setThemePref(v)
            }}
          />

          <p className="mt-4 mb-1 text-[13px] font-semibold">{es.menu.color}</p>
          <p className="mb-2 text-[12px] text-muted">{es.menu.colorAyuda}</p>
          <div role="radiogroup" aria-label={es.menu.color} className="flex flex-wrap gap-1">
            {PALETA.filter((c) => permitidos.includes(c.id)).map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={yo.color === c.id}
                aria-label={c.nombre}
                onClick={() => void w.update('members', yo.id, { color: c.id })}
                className="grid size-11 place-items-center rounded-full"
              >
                <span
                  className="size-8 rounded-full"
                  style={{
                    background: `var(--pc-${c.id})`,
                    boxShadow:
                      yo.color === c.id
                        ? '0 0 0 2px var(--surface),0 0 0 4px var(--ink)'
                        : undefined,
                  }}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="press mt-4 h-11 w-full rounded-full border-[1.5px] border-line text-[15px] font-semibold"
          >
            {es.auth.cerrarSesion}
          </button>
        </div>
      )}
    </div>
  )
}
