import { Outlet, useLocation, useNavigate } from 'react-router'
import { useRows } from '@/app/datos'
import { Segmentado } from '@/components/ui'
import { es } from '@/i18n/es'

/** Listas: Súper y Compras (las Mejoras viven en la pestaña Casa). */
export function ListasLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { rows } = useRows('shopping_items')
  const tab = pathname.endsWith('/compras') ? 'compras' : 'super'
  return (
    <div className="flex flex-col gap-4 pt-1">
      <Segmentado
        label={es.listas.pestanas}
        value={tab}
        onChange={(v) => navigate(`/listas/${v}`, { replace: true })}
        options={[
          ['super', es.listas.superConteo(rows.filter((i) => !i.done).length)],
          ['compras', es.titulos.compras],
        ]}
      />
      <Outlet />
    </div>
  )
}
