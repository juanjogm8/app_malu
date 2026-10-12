import type { Member } from '@/types/db'

/** Primer nombre para saludos ("Juan José Gómez" → "Juan"). */
export function firstName(member: Pick<Member, 'name' | 'email'>): string {
  return (member.name || member.email).trim().split(/\s+/)[0] ?? ''
}
