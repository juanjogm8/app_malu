import type { ReactNode } from 'react'

/** Pantalla centrada para login, sin acceso, carga y errores de configuración. */
export function Pantalla({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-[max(2rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-sm text-center">{children}</div>
    </main>
  )
}
