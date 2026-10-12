import { useEffect, useMemo } from 'react'
import { useAuth } from '@/app/auth-context'
import { useRows } from '@/app/datos'
import { firstName, ordenar } from '@/lib/personas'
import type { Member } from '@/types/db'

export type Slot = 'a' | 'b'

export interface Personas {
  me: Member | null
  partner: Member | null
  members: Member[]
  /** "a" o "b" según el orden de alta (decide --person-a / --person-b). */
  slot: (id: string | null | undefined) => Slot | null
  /** "Yo", el primer nombre de la pareja, "Ambos" o "Sin asignar". */
  label: (personId: string | null, shared?: boolean) => string
  /** Primer nombre de la pareja ("Malu") o "Pareja". */
  partnerName: string
  byId: (id: string | null | undefined) => Member | undefined
}

export function usePersonas(): Personas {
  const { member: me } = useAuth()
  const { rows } = useRows('members')
  return useMemo(() => {
    const members = ordenar(rows.length ? rows : me ? [me] : [])
    const byId = (id: string | null | undefined) => members.find((m) => m.id === id)
    const partner = members.find((m) => m.id !== me?.id) ?? null
    const partnerName = partner ? firstName(partner) : 'Pareja'
    return {
      me,
      partner,
      members,
      byId,
      partnerName,
      slot: (id) => {
        const i = members.findIndex((m) => m.id === id)
        return i === 0 ? 'a' : i === 1 ? 'b' : null
      },
      label: (personId, shared) => {
        if (shared) return 'Ambos'
        if (!personId) return 'Sin asignar'
        if (personId === me?.id) return 'Yo'
        const m = byId(personId)
        return m ? firstName(m) : 'Pareja'
      },
    }
  }, [rows, me])
}

/** Aplica los colores elegidos por cada persona a --person-a y --person-b. */
export function useColoresDePersona() {
  const { members } = usePersonas()
  const [a, b] = members
  useEffect(() => {
    const root = document.documentElement.style
    for (const [slot, m] of [
      ['a', a],
      ['b', b],
    ] as const) {
      if (m) {
        root.setProperty(`--person-${slot}`, `var(--pc-${m.color})`)
        root.setProperty(`--person-${slot}-soft`, `var(--pc-${m.color}-soft)`)
      }
    }
  }, [a, b])
}
