import type { ReactNode } from 'react'

/** Pantalla completa sin navegación (inicio de sesión, sin acceso, carga, configuración). */
export function Pantalla({ children, sol }: { children: ReactNode; sol?: boolean }) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[max(24px,env(safe-area-inset-bottom))]">
      {sol && (
        <>
          <div
            aria-hidden="true"
            className="absolute -top-[120px] -right-[140px] size-[420px] rounded-full bg-sun-soft"
          />
          <div
            aria-hidden="true"
            className="absolute top-[110px] right-10 size-[120px] rounded-full bg-sun"
          />
        </>
      )}
      <div className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col">{children}</div>
    </main>
  )
}
