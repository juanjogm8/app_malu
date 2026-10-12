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
    <section aria-labelledby="titulo-vista" className="pt-1.5">
      <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
        {es.titulos.mas}
      </h1>
      <ul className="mt-4 divide-y divide-tint overflow-hidden rounded-[18px] border border-line bg-surface">
        {opciones.map((o) => (
          <li key={o.to}>
            <Link
              to={o.to}
              className="flex min-h-[62px] items-center gap-3 px-[14px] py-2.5 active:bg-tint"
            >
              <span className="flex-1">
                <span className="block text-[16px] font-semibold">{o.titulo}</span>
                <span className="block text-[13px] text-muted">{o.desc}</span>
              </span>
              <Icon name="derecha" size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
