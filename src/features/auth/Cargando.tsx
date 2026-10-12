import { Pantalla } from '@/components/Pantalla'
import { es } from '@/i18n/es'

export function Cargando() {
  return (
    <Pantalla>
      <p role="status" className="text-muted">
        {es.cargando}
      </p>
    </Pantalla>
  )
}
