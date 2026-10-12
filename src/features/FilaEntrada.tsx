import { usePersonas } from '@/app/personas'
import { Marcador } from '@/components/ui'
import { fila } from '@/components/estilos'
import { slotDe, subtitulo } from '@/features/entradas'
import { es } from '@/i18n/es'
import type { Entry } from '@/lib/calendario'
import { fTime } from '@/lib/fechas'

/** Fila de línea de tiempo: hora (o "Día"), marcador, título y subtítulo. */
export function FilaEntrada({
  e,
  i,
  onOpen,
  accion,
  sub,
  linea,
}: {
  e: Entry
  i: number
  onOpen: () => void
  accion?: React.ReactNode
  sub?: string
  /** En la línea de tiempo del calendario el marcador lleva fondo para tapar la línea. */
  linea?: boolean
}) {
  const p = usePersonas()
  return (
    <div className={`flex min-h-14 items-center gap-3 px-[14px] py-1.5 ${linea ? '' : fila(i)}`}>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="tnum w-[42px] flex-none text-right text-[14px] font-semibold text-muted">
          {e.time ? fTime(e.time) : es.calendario.dia}
        </span>
        <span
          className={linea ? 'grid size-4 flex-none place-items-center rounded-[4px] bg-bg' : ''}
        >
          <Marcador kind={e.kind} slot={slotDe(p, e.personId, e.shared)} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">{e.title}</span>
          <span className="block text-[13px] text-muted">{sub ?? subtitulo(e, p)}</span>
        </span>
      </button>
      {accion}
    </div>
  )
}
