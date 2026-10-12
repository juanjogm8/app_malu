import type { Member } from '@/types/db'

/** Círculo con la inicial y el color de la persona. */
export function Avatar({
  member,
  size = 32,
}: {
  member: Pick<Member, 'name' | 'email' | 'color'>
  size?: number
}) {
  const initial = (member.name || member.email).trim().charAt(0).toUpperCase()
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  )
}
