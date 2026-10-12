import { useCallback, useState } from 'react'
import { useAuth } from '@/app/auth-context'

/**
 * Preferencia de interfaz guardada en el navegador, por persona (filtros, capas del calendario,
 * ocultar comprados). Si el almacenamiento no está disponible, vive solo en memoria.
 */
export function usePreferencia<T>(clave: string, inicial: T): [T, (v: T) => void] {
  const { member } = useAuth()
  const key = `casa:${member?.id ?? 'anon'}:${clave}`
  const [valor, setValor] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? inicial : (JSON.parse(raw) as T)
    } catch {
      return inicial
    }
  })
  const guardar = useCallback(
    (v: T) => {
      setValor(v)
      try {
        localStorage.setItem(key, JSON.stringify(v))
      } catch {
        /* almacenamiento no disponible */
      }
    },
    [key],
  )
  return [valor, guardar]
}
