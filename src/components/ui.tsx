/* Piezas del Sistema 2b: botones, tarjetas, casillas, chips, píldoras, marcadores. */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import type { IconName } from '@/components/Icon'
import { fillPersona } from '@/components/estilos'
import type { QuienSlot } from '@/components/estilos'
import type { EntryKind } from '@/lib/calendario'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Botones ---------- */

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'enlace'
const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-accent text-accent-ink active:bg-[color-mix(in_oklab,var(--accent)_80%,var(--ink))] disabled:bg-tint disabled:text-muted',
  secundario:
    'border-[1.5px] border-accent text-accent active:bg-accent-soft disabled:border-line disabled:text-muted',
  fantasma: 'text-accent active:bg-tint disabled:text-muted disabled:opacity-60',
  peligro: 'text-danger active:bg-danger-soft',
  enlace: 'text-accent underline underline-offset-3 active:text-ink',
}

export function Boton({
  variante = 'primario',
  chico,
  compacto,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  chico?: boolean
  /** Botón Agregar de las capturas: 44 px de alto, padding de 16 px. */
  compacto?: boolean
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'press inline-flex flex-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
        chico
          ? 'h-9 px-[14px] text-[14px]'
          : compacto
            ? 'h-11 px-4 text-[14px]'
            : 'h-12 px-[22px] text-[15px]',
        VARIANTES[variante],
        className,
      )}
    />
  )
}

/** Botón de ícono circular de 44 px (flechas del calendario). */
export function BotonIcono({
  icon,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={cx(
        'press grid size-11 flex-none place-items-center rounded-full border border-line bg-surface active:bg-tint',
        className,
      )}
    >
      <Icon name={icon} size={20} />
    </button>
  )
}

/* ---------- Contenedores ---------- */

export function Tarjeta({
  children,
  className,
  tono = 'normal',
}: {
  children: ReactNode
  className?: string
  tono?: 'normal' | 'atrasado'
}) {
  return (
    <div
      className={cx(
        'overflow-hidden rounded-[18px]',
        tono === 'atrasado' ? 'bg-danger-soft' : 'border border-line bg-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Título de grupo (display-m o el tamaño dado) con conteo a un lado. */
export function GrupoTitulo({
  titulo,
  conteo,
  alerta,
  tam = 24,
  accion,
  id,
}: {
  titulo: string
  conteo?: number | string
  alerta?: boolean
  tam?: number
  accion?: ReactNode
  id?: string
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-2 px-1 pb-2',
        alerta ? 'text-danger' : 'text-ink',
        accion ? 'justify-between' : '',
      )}
    >
      <span className="flex items-baseline gap-2">
        {alerta && <Icon name="alerta" size={18} stroke={2.4} className="self-center" />}
        <h2 id={id} className="font-display font-normal" style={{ fontSize: tam }}>
          {titulo}
        </h2>
        {conteo !== undefined && (
          <span className={cx('text-[13px]', alerta ? 'font-bold' : 'text-muted')}>{conteo}</span>
        )}
      </span>
      {accion}
    </div>
  )
}

/* ---------- Casilla ---------- */

export function Casilla({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="group -m-[7px] grid size-11 flex-none place-items-center rounded-full"
    >
      <span
        className={cx(
          'grid size-[30px] place-items-center rounded-full border-2 text-accent-ink transition-transform duration-[var(--dur-fast)] group-active:scale-92',
          checked ? 'border-accent bg-accent' : 'border-muted bg-surface',
        )}
      >
        {checked && <Icon name="palomita" size={18} stroke={3} />}
      </span>
    </button>
  )
}

/* ---------- Personas y marcadores ---------- */

export function PuntoPersona({ slot, size = 8 }: { slot: QuienSlot; size?: number }) {
  return (
    <i
      aria-hidden="true"
      className="inline-block flex-none rounded-full"
      style={{ width: size, height: size, background: fillPersona(slot) }}
    />
  )
}

const FORMAS: Record<EntryKind, CSSProperties> = {
  evento: { width: 12, height: 12, borderRadius: '50%' },
  pendiente: { width: 12, height: 12, borderRadius: 3 },
  fecha: { width: 10, height: 10, borderRadius: 1.5, transform: 'rotate(45deg)' },
  ninos: { width: 14, height: 12, clipPath: 'polygon(50% 0,100% 100%,0 100%)' },
  plan: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    WebkitMaskImage: 'radial-gradient(circle,transparent 3.5px,#000 4px)',
    maskImage: 'radial-gradient(circle,transparent 3.5px,#000 4px)',
  },
  comida: { width: 16, height: 8, borderRadius: 4 },
}

/** Forma = tipo de entrada; color = quién. */
export function Marcador({
  kind,
  slot,
  color,
  style,
}: {
  kind: EntryKind
  slot?: QuienSlot
  color?: string
  style?: CSSProperties
}) {
  return (
    <span className="grid w-4 flex-none place-items-center" aria-hidden="true">
      <span
        className="block"
        style={{ ...FORMAS[kind], background: color ?? fillPersona(slot ?? null), ...style }}
      />
    </span>
  )
}

/* ---------- Chips ---------- */

type ChipTono = 'tint' | 'atrasado' | 'pronto' | 'hecho' | 'prioridad' | 'persona' | 'libre'
const CHIP: Record<ChipTono, string> = {
  tint: 'bg-tint text-ink font-semibold',
  atrasado: 'bg-danger-soft text-danger font-bold',
  pronto: 'bg-warn-soft text-warn font-bold',
  hecho: 'bg-ok-soft text-ok font-bold',
  prioridad: 'border border-danger text-danger font-bold',
  persona: 'border border-line bg-surface text-ink font-semibold',
  libre: 'border border-dashed border-muted text-muted font-semibold',
}

export function Chip({
  tono = 'tint',
  icon,
  slot,
  children,
}: {
  tono?: ChipTono
  icon?: IconName
  slot?: QuienSlot
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex h-[26px] items-center gap-[5px] rounded-[13px] px-[9px] text-[12.5px] whitespace-nowrap',
        CHIP[tono],
      )}
    >
      {slot !== undefined && tono === 'persona' && <PuntoPersona slot={slot} />}
      {icon && <Icon name={icon} size={12} stroke={2.8} />}
      {children}
    </span>
  )
}

/** Chip de filtro (Pendientes, Casa): activo en tinta con palomita. */
export function ChipFiltro({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cx(
        'press flex h-11 flex-none items-center',
        // 36 px visibles dentro de un área táctil de 44 px
      )}
    >
      <span
        className={cx(
          'flex h-9 items-center gap-1.5 rounded-[18px] border px-[14px] text-[14px] whitespace-nowrap',
          activo ? 'border-ink bg-ink font-semibold text-bg' : 'border-line bg-surface font-medium',
        )}
      >
        {activo && <Icon name="palomita" size={14} stroke={3} />}
        {children}
      </span>
    </button>
  )
}

/* ---------- Píldora selectora (prioridad, estado) ---------- */

export type PildoraTono = 'danger' | 'warn' | 'tint' | 'info' | 'ok' | 'tint-muted'
const PILDORA: Record<PildoraTono, string> = {
  danger: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-warn',
  tint: 'bg-tint text-ink',
  'tint-muted': 'bg-tint text-muted',
  info: 'bg-info-soft text-info',
  ok: 'bg-ok-soft text-ok',
}

export function Pildora<V extends string>({
  value,
  options,
  tono,
  onChange,
  label,
  disabled,
}: {
  value: V
  options: [V, string][]
  tono: PildoraTono
  onChange: (v: V) => void
  label: string
  disabled?: boolean
}) {
  const actual = options.find((o) => o[0] === value)?.[1] ?? value
  return (
    <label
      className={cx(
        'relative inline-flex h-[30px] flex-none items-center gap-1 rounded-[15px] pr-[9px] pl-[11px] text-[13px] font-bold whitespace-nowrap focus-within:shadow-[0_0_0_3px_var(--bg),0_0_0_5px_var(--focus)]',
        PILDORA[tono],
      )}
    >
      {actual}
      <Icon name="abajo" size={14} stroke={2.6} />
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as V)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

/* ---------- Segmentado ---------- */

export function Segmentado<V extends string>({
  value,
  options,
  onChange,
  label,
  chico,
}: {
  value: V
  options: [V, ReactNode][]
  onChange: (v: V) => void
  label: string
  chico?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('grid bg-tint', chico ? 'rounded-[20px] p-[3px]' : 'rounded-[22px] p-1')}
      style={{ gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))` }}
    >
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cx(
            'grid place-items-center',
            chico
              ? 'h-[38px] rounded-[17px] text-[14px] font-semibold'
              : 'h-11 rounded-[18px] text-[15px]',
            value === v
              ? 'bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--line)]'
              : cx('text-muted', !chico && 'font-medium'),
          )}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

/* ---------- Interruptor ---------- */

export function Interruptor({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 items-center gap-2 text-[14px] text-muted"
    >
      <span
        className={cx(
          'relative h-6 w-10 flex-none rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] size-[18px] rounded-full bg-surface transition-[left] duration-[var(--dur)]',
            checked ? 'left-[19px]' : 'left-[3px]',
          )}
        />
      </span>
      {children}
    </button>
  )
}

/* ---------- Estado vacío ---------- */

export function Vacio({
  icon,
  titulo,
  texto,
  chips,
  onChip,
}: {
  icon: IconName
  titulo: string
  texto: string
  chips?: string[]
  onChip?: (c: string) => void
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[22px] border border-line bg-surface px-[18px] pt-[26px] pb-5 text-center">
      <span className="grid size-[60px] place-items-center rounded-full bg-sun-soft text-ink">
        <Icon name={icon} size={26} stroke={1.8} />
      </span>
      <h2 className="font-display text-[22px] leading-[1.2] font-normal">{titulo}</h2>
      <p className="max-w-[290px] text-[15px] leading-[1.45] text-muted">{texto}</p>
      {chips && onChip && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChip(c)}
              className="press flex h-10 items-center gap-1.5 rounded-[20px] border border-line bg-bg pr-[14px] pl-[10px] text-[15px] font-semibold"
            >
              <Icon name="agregar" size={14} stroke={2.6} className="text-accent" />
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Confirmación en línea (Limpiar comprados / hechos). */
export function Confirmar({
  pregunta,
  si,
  onSi,
  onNo,
}: {
  pregunta: string
  si: string
  onSi: () => void
  onNo: () => void
}) {
  return (
    <div
      role="alertdialog"
      aria-label={pregunta}
      className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-surface px-[14px] py-3"
    >
      <span className="text-[15px] font-semibold">{pregunta}</span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={onSi}
          className="press h-10 rounded-[20px] bg-danger-soft px-4 text-[14px] font-semibold text-danger"
        >
          {si}
        </button>
        <button
          type="button"
          onClick={onNo}
          className="press h-10 rounded-[20px] px-4 text-[14px] font-semibold text-accent"
        >
          Cancelar
        </button>
      </span>
    </div>
  )
}
