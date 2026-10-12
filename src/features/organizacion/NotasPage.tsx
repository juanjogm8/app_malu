import { useState } from 'react'
import { useRows } from '@/app/datos'
import { usePersonas } from '@/app/personas'
import { usePreferencia } from '@/app/preferencias'
import { Esqueleto } from '@/components/Esqueleto'
import { fila } from '@/components/estilos'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { Segmentado, Vacio } from '@/components/ui'
import { useHojas } from '@/features/hojas'
import { es } from '@/i18n/es'
import { fShort, today } from '@/lib/fechas'
import { searchContacts, searchNotes } from '@/lib/organizacion'
import { TituloConAgregar } from './comun'

const t = es.notas
type Tab = 'notas' | 'contactos'

export function NotasPage() {
  const [tab, setTab] = usePreferencia<Tab>('notas:tab', 'notas')
  const [q, setQ] = useState('')
  const hojas = useHojas()
  const p = usePersonas()
  const toast = useToast()
  const notas = useRows('notes')
  const contactos = useRows('contacts')
  const loading = tab === 'notas' ? notas.loading : contactos.loading

  const copiar = async (tel: string) => {
    try {
      await navigator.clipboard.writeText(tel)
      toast.show(t.copiado)
    } catch {
      toast.show(t.noCopiado)
    }
  }
  /** "3 oct" a partir de un timestamp, en la zona de la casa. */
  const dia = (ts: string) => {
    const d = new Date(ts)
    return Number.isNaN(d.getTime()) ? '' : fShort(today(d))
  }

  return (
    <section aria-labelledby="titulo-vista" className="flex flex-col gap-3.5">
      <TituloConAgregar
        titulo={tab === 'notas' ? t.notas : t.contactos}
        onAgregar={() => (tab === 'notas' ? hojas.nuevaNota() : hojas.nuevoContacto())}
      />
      <Segmentado
        label={es.titulos.notas}
        value={tab}
        onChange={(v) => {
          setTab(v)
          setQ('')
        }}
        options={[
          ['notas', t.notas],
          ['contactos', t.contactos],
        ]}
      />
      <label className="flex h-[46px] items-center gap-2.5 rounded-[23px] border border-line bg-surface px-4 focus-within:border-accent">
        <Icon name="buscar" size={18} className="flex-none text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === 'notas' ? t.buscarNotas : t.buscarContactos}
          aria-label={tab === 'notas' ? t.buscarNotas : t.buscarContactos}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted focus-visible:shadow-none"
        />
      </label>

      {loading ? (
        <Esqueleto />
      ) : tab === 'notas' ? (
        !notas.rows.length ? (
          <Vacio icon="notas" titulo={t.vacioNotas} texto={t.vacioNotasTexto} />
        ) : (
          <Lista vacio={t.sinResultados}>
            {searchNotes(notas.rows, q).map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => hojas.editarNota(n)}
                className={`flex w-full flex-col gap-[3px] px-[14px] pt-3 pb-3.5 text-left ${fila(i)}`}
              >
                <span className="text-[16px] font-semibold">{n.title}</span>
                {n.body && (
                  <span className="line-clamp-2 text-[14px] leading-[1.4] whitespace-pre-line text-muted">
                    {n.body}
                  </span>
                )}
                <span className="mt-1 text-[12px] text-muted">
                  {t.meta(
                    n.created_by === p.me?.id ? 'ti' : p.label(n.created_by),
                    dia(n.updated_at),
                  )}
                </span>
              </button>
            ))}
          </Lista>
        )
      ) : !contactos.rows.length ? (
        <Vacio icon="notas" titulo={t.vacioContactos} texto={t.vacioContactosTexto} />
      ) : (
        <Lista vacio={t.sinResultados}>
          {searchContacts(contactos.rows, q).map((c, i) => (
            <div
              key={c.id}
              className={`flex min-h-[70px] items-center gap-3 py-2.5 pr-2.5 pl-[14px] ${fila(i)}`}
            >
              <span
                aria-hidden="true"
                className="grid size-10 flex-none place-items-center rounded-full bg-tint font-display text-[17px]"
              >
                {c.name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => hojas.editarContacto(c)}
                  className="block text-left text-[16px] font-semibold"
                >
                  {c.name}
                </button>
                {c.role && <div className="text-[13px] text-muted">{c.role}</div>}
                {c.phone && (
                  <div className="tnum mt-0.5 text-[15px] font-semibold text-accent select-all">
                    {c.phone}
                  </div>
                )}
              </div>
              {c.phone && (
                <button
                  type="button"
                  onClick={() => void copiar(c.phone!)}
                  aria-label={t.copiarDe(c.name)}
                  className="press flex h-10 items-center gap-1.5 rounded-[20px] border-[1.5px] border-line px-3 text-[14px] font-semibold"
                >
                  <Icon name="copiar" size={16} />
                  {t.copiar}
                </button>
              )}
            </div>
          ))}
        </Lista>
      )}
    </section>
  )
}

function Lista({ children, vacio }: { children: React.ReactNode[]; vacio: string }) {
  if (!children.length) return <p className="px-1 text-muted">{vacio}</p>
  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface">{children}</div>
  )
}
