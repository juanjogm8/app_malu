/* Utilidades de estilo compartidas por los componentes. */

/** Divisor interno de fila en --tint, salvo la primera. */
export const fila = (i: number) => (i ? 'border-t border-tint' : '')

/** Quién: persona A, persona B, "Ambos" (punto partido) o nadie. */
export type QuienSlot = 'a' | 'b' | 'both' | null

export const fillPersona = (s: QuienSlot): string =>
  s === 'both'
    ? 'linear-gradient(90deg,var(--person-a) 0 50%,var(--person-b) 50% 100%)'
    : s
      ? `var(--person-${s})`
      : 'var(--muted)'
