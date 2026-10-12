import { Link } from 'react-router'
import { EnConstruccion } from '@/components/EnConstruccion'
import { es } from '@/i18n/es'

/** Envoltura de las subvistas de Más: agrega el botón "‹ Más". */
export function SubvistaMas({ titulo }: { titulo: string }) {
  return (
    <>
      <Link
        to="/mas"
        className="ml-2 mt-2 inline-flex min-h-tap items-center px-2 text-sm font-medium text-accent"
      >
        {es.mas.volver}
      </Link>
      <EnConstruccion titulo={titulo} />
    </>
  )
}
