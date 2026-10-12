import { useState } from 'react'
import { useRows } from '@/app/datos'
import { Esqueleto } from '@/components/Esqueleto'
import { Icon } from '@/components/Icon'
import { fila } from '@/components/estilos'
import { useToast } from '@/components/Toast'
import { Boton, BotonIcono } from '@/components/ui'
import { useHojas } from '@/features/hojas'
import { useAgregarAlSuper } from '@/features/listas/agregarSuper'
import { es } from '@/i18n/es'
import { addDays, fDay, fRange, startOfWeek, today } from '@/lib/fechas'
import { mealIngredients, splitIng } from '@/lib/ingredientes'
import { plannedMeals } from '@/lib/organizacion'
import type { Meal } from '@/types/db'

const t = es.comidas
const COMIDAS: [Meal['meal'], string][] = [
  ['desayuno', 'Desayuno'],
  ['comida', 'Comida'],
  ['cena', 'Cena'],
]

export function ComidasPage() {
  const hoy = today()
  const [lunes, setLunes] = useState(() => startOfWeek(hoy))
  const { rows: meals, loading } = useRows('meals')
  const hojas = useHojas()
  const agregar = useAgregarAlSuper()
  const toast = useToast()
  const [pasando, setPasando] = useState(false)

  const domingo = addDays(lunes, 6)
  const ingredientes = mealIngredients(meals, lunes, domingo)
  const planeadas = plannedMeals(meals, lunes)
  const pct = Math.round((planeadas / 21) * 100)

  const pasar = async () => {
    setPasando(true)
    let n = 0
    for (const ing of ingredientes) if ((await agregar(ing, null, true)) === 'nuevo') n++
    setPasando(false)
    toast.show(n ? t.agregados(n) : t.yaEstaban)
  }

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-3.5">
      <h1 id="titulo-vista" className="font-display text-[30px] leading-none font-normal">
        {es.titulos.comidas}
      </h1>
      <div className="flex items-center gap-1.5">
        <BotonIcono
          icon="izquierda"
          label={t.anterior}
          onClick={() => setLunes(addDays(lunes, -7))}
        />
        <button
          type="button"
          onClick={() => setLunes(startOfWeek(hoy))}
          className="flex-1 text-center font-display text-[20px]"
          aria-label={t.irHoy}
        >
          {fRange(lunes, domingo)}
        </button>
        <BotonIcono
          icon="derecha"
          label={t.siguiente}
          onClick={() => setLunes(addDays(lunes, 7))}
        />
      </div>
      <Boton disabled={!ingredientes.length || pasando} onClick={() => void pasar()}>
        <Icon name="flecha" size={18} />
        {t.pasar(ingredientes.length)}
      </Boton>

      {!loading && (
        // Tableta: tabla de día × 3 comidas.
        <div className="hidden overflow-hidden rounded-[18px] border border-line bg-surface md:block">
          <div className="grid grid-cols-[120px_repeat(3,minmax(0,1fr))] border-b border-line">
            <span />
            {COMIDAS.map(([meal, label]) => (
              <span key={meal} className="eyebrow px-3 pt-3 pb-2.5 text-muted">
                {label}
              </span>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).map((d, i) => (
            <div
              key={d}
              className={`grid grid-cols-[120px_repeat(3,minmax(0,1fr))] ${i ? 'border-t border-tint' : ''} ${d === hoy ? 'bg-sun-soft' : ''}`}
            >
              <span className="px-3.5 py-3 font-display text-[17px]">
                {fDay(d).replace(/^(\S{3})\S*/, '$1')}
              </span>
              {COMIDAS.map(([meal, label]) => {
                const m = meals.find((x) => x.date === d && x.meal === meal)
                const n = splitIng(m?.ingredients).length
                return (
                  <button
                    key={meal}
                    type="button"
                    aria-label={`${label}, ${fDay(d)}: ${m?.text || t.sinPlanear}`}
                    onClick={() => hojas.abrirComida(d, meal)}
                    className="flex min-w-0 flex-col items-start gap-0.5 px-3 py-2.5 text-left"
                  >
                    <span
                      className={`w-full truncate text-[15px] ${m?.text ? 'font-semibold' : 'text-muted italic'}`}
                    >
                      {m?.text || t.sinPlanear}
                    </span>
                    {n > 0 && <span className="text-[12px] text-muted">{t.ingredientes(n)}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <Esqueleto />
      ) : (
        Array.from({ length: 7 }, (_, i) => addDays(lunes, i)).map((d) => (
          <div key={d} className="flex flex-col gap-1.5 md:hidden">
            <div className="flex items-center gap-2 px-1">
              <h2 className="font-display text-[19px] font-normal">{fDay(d)}</h2>
              {d === hoy && (
                <span className="flex h-[22px] items-center rounded-[11px] bg-sun px-2 text-[12px] font-bold text-sun-ink">
                  {es.calendario.hoy}
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
              {COMIDAS.map(([meal, label], i) => {
                const m = meals.find((x) => x.date === d && x.meal === meal)
                const n = splitIng(m?.ingredients).length
                return (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => hojas.abrirComida(d, meal)}
                    className={`flex min-h-[50px] w-full items-center gap-3 py-1 pr-3 pl-[14px] text-left ${fila(i)}`}
                  >
                    <span className="w-[78px] flex-none text-[12px] font-bold tracking-[0.06em] text-muted uppercase">
                      {label}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-[16px] ${m?.text ? 'font-semibold' : 'text-muted italic'}`}
                    >
                      {m?.text || t.sinPlanear}
                    </span>
                    {n > 0 && (
                      <span className="flex h-[26px] items-center rounded-[13px] bg-tint px-[9px] text-[12.5px] font-semibold whitespace-nowrap">
                        {t.ingredientes(n)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}

      <div className="flex flex-col gap-2 px-1 pt-1.5">
        <div className="flex justify-between text-[14px]">
          <span className="font-semibold">{t.planeadas(planeadas)}</span>
          <span className="text-muted">{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={planeadas}
          aria-valuemin={0}
          aria-valuemax={21}
          aria-label={t.planeadas(planeadas)}
          className="h-2 overflow-hidden rounded bg-tint"
        >
          <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  )
}
