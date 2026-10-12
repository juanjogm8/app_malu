import { NavLink } from 'react-router'
import { useRows } from '@/app/datos'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { es } from '@/i18n/es'
import { today } from '@/lib/fechas'
import { tasksBadge } from '@/lib/pendientes'

interface Destino {
  to: string
  label: string
  icon: IconName
  end?: boolean
  badge?: number
  badgeTono?: string
}

export function BarraInferior() {
  const { rows: tasks } = useRows('tasks')
  const { rows: super_ } = useRows('shopping_items')
  const destinos: Destino[] = [
    { to: '/', label: es.nav.inicio, icon: 'inicio', end: true },
    { to: '/calendario', label: es.nav.calendario, icon: 'calendario' },
    {
      to: '/pendientes',
      label: es.nav.pendientes,
      icon: 'pendientes',
      badge: tasksBadge(tasks, today()),
      badgeTono: 'bg-danger',
    },
    {
      to: '/listas',
      label: es.nav.listas,
      icon: 'listas',
      badge: super_.filter((i) => !i.done).length,
      badgeTono: 'bg-ink',
    },
    { to: '/casa', label: es.nav.casa, icon: 'casa' },
  ]
  return (
    <nav
      aria-label={es.nav.principal}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[max(10px,env(safe-area-inset-bottom))]"
    >
      <ul className="mx-auto grid max-w-[520px] grid-cols-5 px-2 pt-2.5">
        {destinos.map((d) => (
          <li key={d.to}>
            <NavLink
              to={d.to}
              end={d.end}
              className={({ isActive }) =>
                `relative flex min-h-[52px] flex-col items-center gap-1 text-[11px] leading-[1.2] ${
                  isActive ? 'font-bold text-accent' : 'font-medium text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={d.icon} stroke={1.8} />
                  {d.label}
                  <i
                    aria-hidden="true"
                    className={`size-[5px] rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`}
                  />
                  {!!d.badge && (
                    <span
                      className={`absolute -top-1.5 left-[calc(50%+6px)] h-[18px] min-w-[18px] rounded-[9px] px-[5px] text-center text-[11px] leading-[18px] font-bold text-bg ${d.badgeTono}`}
                    >
                      {d.badge}
                      <span className="sr-only"> pendientes</span>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
