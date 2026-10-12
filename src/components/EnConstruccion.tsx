import { es } from '@/i18n/es'

export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <section aria-labelledby="titulo-vista" className="pt-1.5">
      <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
        {titulo}
      </h1>
      <p className="mt-3 text-muted">{es.enConstruccion}</p>
    </section>
  )
}
