import { NavLink } from 'react-router'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { es } from '@/i18n/es'

const destinos: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: es.nav.inicio, icon: 'inicio', end: true },
  { to: '/calendario', label: es.nav.calendario, icon: 'calendario' },
  { to: '/pendientes', label: es.nav.pendientes, icon: 'pendientes' },
  { to: '/listas', label: es.nav.listas, icon: 'listas' },
  { to: '/casa', label: es.nav.casa, icon: 'casa' },
]

export function BarraInferior() {
  return (
    <nav
      aria-label={es.nav.principal}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-16 max-w-2xl grid-cols-5 px-[env(safe-area-inset-left)]">
        {destinos.map((d) => (
          <li key={d.to}>
            <NavLink
              to={d.to}
              end={d.end}
              className={({ isActive }) =>
                `flex h-full min-h-tap flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              <Icon name={d.icon} />
              {d.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
