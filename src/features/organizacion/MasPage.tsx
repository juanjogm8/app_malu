import { Link } from 'react-router'
import { useRows } from '@/app/datos'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { fila } from '@/components/estilos'
import { es } from '@/i18n/es'
import { startOfWeek, today } from '@/lib/fechas'
import { dateInfos } from '@/lib/fechas-importantes'
import { plannedMeals } from '@/lib/organizacion'

const t = es.mas

export function MasPage() {
  const hoy = today()
  const { rows: meals } = useRows('meals')
  const { rows: kids } = useRows('kid_items')
  const { rows: dates } = useRows('important_dates')
  const { rows: plans } = useRows('plans')
  const { rows: notes } = useRows('notes')
  const { rows: contacts } = useRows('contacts')

  const proximosNinos = kids.filter((k) => !k.done && k.date && k.date >= hoy).length
  const fechasMes = dateInfos(dates, hoy).filter((x) => x.days >= 0 && x.days <= 30).length
  const ideas = plans.filter((p) => p.status === 'idea').length
  const opciones: { to: string; titulo: string; sub: string; icon: IconName; dato: string }[] = [
    {
      to: '/mas/comidas',
      titulo: t.comidas,
      sub: t.comidasSub,
      icon: 'comidas',
      dato: t.deVeintiuno(plannedMeals(meals, startOfWeek(hoy))),
    },
    {
      to: '/mas/ninos',
      titulo: es.titulos.ninos,
      sub: t.ninosSub,
      icon: 'ninos',
      dato: proximosNinos ? t.proximos(proximosNinos) : '',
    },
    {
      to: '/mas/fechas',
      titulo: es.titulos.fechas,
      sub: t.fechasSub,
      icon: 'fechas',
      dato: fechasMes ? t.esteMes(fechasMes) : '',
    },
    {
      to: '/mas/planes',
      titulo: t.planes,
      sub: t.planesSub,
      icon: 'planes',
      dato: ideas ? t.ideas(ideas) : '',
    },
    {
      to: '/mas/notas',
      titulo: es.titulos.notas,
      sub: t.notasSub,
      icon: 'notas',
      dato: notes.length + contacts.length ? String(notes.length + contacts.length) : '',
    },
    {
      to: '/mas/ajustes',
      titulo: es.ajustes.titulo,
      sub: es.ajustes.sub,
      icon: 'ajustes',
      dato: '',
    },
  ]

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-4 pt-1.5">
      <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
        {es.titulos.mas}
      </h1>
      <Link
        to="/revision"
        className="press flex items-center gap-3.5 rounded-[22px] bg-sun-soft p-4"
      >
        <span aria-hidden="true" className="size-11 flex-none rounded-full bg-sun" />
        <span className="flex-1">
          <span className="block font-display text-[20px]">{es.titulos.revision}</span>
          <span className="block text-[13px] text-muted">{t.revisionSub}</span>
        </span>
        <Icon name="derecha" size={18} className="text-muted" />
      </Link>
      <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
        {opciones.map((o, i) => (
          <Link
            key={o.to}
            to={o.to}
            className={`flex min-h-[72px] items-center gap-3.5 px-[14px] py-2.5 active:bg-tint ${fila(i)}`}
          >
            <span className="grid size-10 flex-none place-items-center rounded-full bg-accent-soft text-accent">
              <Icon name={o.icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{o.titulo}</span>
              <span className="block text-[13px] text-muted">{o.sub}</span>
            </span>
            {o.dato && (
              <span className="text-[13px] font-semibold whitespace-nowrap text-muted">
                {o.dato}
              </span>
            )}
            <Icon name="derecha" size={18} className="text-muted" />
          </Link>
        ))}
      </div>
    </section>
  )
}
