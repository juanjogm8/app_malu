import { Link } from 'react-router'
import { EnConstruccion } from '@/components/EnConstruccion'
import { es } from '@/i18n/es'

/** Envoltura de las subvistas de Más: agrega el botón "‹ Más". */
export function SubvistaMas({ titulo }: { titulo: string }) {
  return (
    <>
      <Link
        to="/mas"
        className="-ml-1 inline-flex h-11 items-center px-1 text-[16px] font-semibold text-accent"
      >
        {es.mas.volver}
      </Link>
      <EnConstruccion titulo={titulo} />
    </>
  )
}
