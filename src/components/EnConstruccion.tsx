import { es } from '@/i18n/es'

export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <section aria-labelledby="titulo-vista" className="px-4 py-6">
      <h1 id="titulo-vista" className="text-2xl font-semibold">
        {titulo}
      </h1>
      <p className="mt-2 text-muted">{es.enConstruccion}</p>
    </section>
  )
}
