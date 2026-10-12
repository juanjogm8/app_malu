import type { ReactNode } from 'react'
import { Boton } from '@/components/ui'
import { es } from '@/i18n/es'

/** Título de subvista de Más con el botón "+ Agregar". */
export function TituloConAgregar({ titulo, onAgregar }: { titulo: string; onAgregar: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
        {titulo}
      </h1>
      <Boton chico className="h-10" onClick={onAgregar}>
        {es.mas.agregar}
      </Boton>
    </div>
  )
}

export function Filtros({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 -my-1 flex gap-1.5 overflow-x-auto px-4">
      {children}
    </div>
  )
}
