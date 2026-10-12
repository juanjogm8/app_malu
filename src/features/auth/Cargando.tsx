import { Pantalla } from '@/components/Pantalla'
import { es } from '@/i18n/es'

export function Cargando() {
  return (
    <Pantalla>
      <div className="flex h-[52px] items-center justify-between px-[18px]">
        <span className="font-display text-[17px]">{es.app.name}</span>
        <span className="skeleton size-8 rounded-full" />
      </div>
      <div className="flex flex-col gap-[18px] px-4 pt-2.5" role="status" aria-label={es.cargando}>
        <span className="skeleton h-[34px] w-[230px] rounded-[10px]" />
        <span className="skeleton h-3.5 w-[150px] rounded-[7px]" />
        <span className="skeleton h-[52px] rounded-[18px]" />
        <span className="skeleton h-[220px] rounded-[18px]" />
      </div>
    </Pantalla>
  )
}
