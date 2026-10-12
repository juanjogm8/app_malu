import type { Member } from '@/types/db'

/** Primer nombre para saludos ("Juan José Gómez" → "Juan"). */
export function firstName(member: Pick<Member, 'name' | 'email'>): string {
  return (member.name || member.email).trim().split(/\s+/)[0] ?? ''
}

/** Paleta de persona (tokens.json → personPalette). Una persona fría y una cálida. */
export const PALETA = [
  { id: 'azul', nombre: 'Azul', grupo: 'frio' },
  { id: 'ciruela', nombre: 'Ciruela', grupo: 'frio' },
  { id: 'jade', nombre: 'Jade', grupo: 'frio' },
  { id: 'teja', nombre: 'Teja', grupo: 'calido' },
  { id: 'ocre', nombre: 'Ocre', grupo: 'calido' },
  { id: 'rosa', nombre: 'Rosa', grupo: 'calido' },
] as const

export type ColorId = (typeof PALETA)[number]['id']

export const grupoDe = (id: string) => PALETA.find((p) => p.id === id)?.grupo

/** Colores que puede elegir una persona: los del grupo contrario al de la otra (frío / cálido). */
export function coloresPermitidos(otro: string | undefined): ColorId[] {
  const g = otro ? grupoDe(otro) : undefined
  return PALETA.filter((p) => !g || p.grupo !== g).map((p) => p.id)
}

/** Orden estable: la persona A es la que entró primero. */
export function ordenar(members: Member[]): Member[] {
  return [...members].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
}

/** Responsable en los formularios: id de persona, "Ambos" o nadie. */
export type WhoValue = string | 'both' | ''

export function whoFrom(personId: string | null, shared: boolean): WhoValue {
  return shared ? 'both' : (personId ?? '')
}
export function whoToTask(v: WhoValue) {
  return { assignee_id: v && v !== 'both' ? v : null, is_shared: v === 'both' }
}
export function whoToEvent(v: WhoValue) {
  return { owner_id: v && v !== 'both' ? v : null, is_shared: v === 'both' }
}
