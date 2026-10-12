import type { QuienSlot } from '@/components/estilos'
import { fillPersona } from '@/components/estilos'
import type { Member } from '@/types/db'

/** Círculo con la inicial en el color de la persona. */
export function Avatar({
  member,
  slot,
  size = 32,
}: {
  member: Pick<Member, 'name' | 'email'> | undefined
  slot: QuienSlot
  size?: number
}) {
  const initial = member ? (member.name || member.email).trim().charAt(0).toUpperCase() : '?'
  return (
    <span
      aria-hidden="true"
      className="inline-grid flex-none place-items-center rounded-full font-bold text-bg"
      style={{
        width: size,
        height: size,
        background: fillPersona(slot),
        fontSize: size <= 24 ? 11 : 14,
      }}
    >
      {initial}
    </span>
  )
}
