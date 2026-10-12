import { Link } from 'react-router'
import { Icon } from '@/components/Icon'
import { es } from '@/i18n/es'

const opciones = [
  { to: '/mas/comidas', titulo: es.titulos.comidas, desc: es.mas.descripcion.comidas },
  { to: '/mas/ninos', titulo: es.titulos.ninos, desc: es.mas.descripcion.ninos },
  { to: '/mas/fechas', titulo: es.titulos.fechas, desc: es.mas.descripcion.fechas },
  { to: '/mas/planes', titulo: es.titulos.planes, desc: es.mas.descripcion.planes },
  { to: '/mas/notas', titulo: es.titulos.notas, desc: es.mas.descripcion.notas },
  { to: '/revision', titulo: es.titulos.revision, desc: es.mas.descripcion.revision },
]

export function MasPage() {
  return (
    <section aria-labelledby="titulo-vista" className="px-4 py-6">
      <h1 id="titulo-vista" className="text-2xl font-semibold">
        {es.titulos.mas}
      </h1>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {opciones.map((o) => (
          <li key={o.to}>
            <Link
              to={o.to}
              className="flex min-h-tap items-center gap-3 px-4 py-3 hover:bg-surface-2"
            >
              <span className="flex-1">
                <span className="block font-medium">{o.titulo}</span>
                <span className="block text-sm text-muted">{o.desc}</span>
              </span>
              <Icon name="chevron" size={20} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
