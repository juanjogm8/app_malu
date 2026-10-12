import { useRegisterSW } from 'virtual:pwa-register/react'
import { es } from '@/i18n/es'

/** Aviso "Hay una versión nueva · Actualizar" del service worker. */
export function ActualizarApp() {
  const {
    needRefresh: [hayNueva, setHayNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Revisa si hay versión nueva cada hora mientras la app esté abierta.
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000)
    },
  })
  if (!hayNueva) return null
  return (
    <div
      role="status"
      className="toast-in fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8px)] z-50 mx-auto flex min-h-[54px] max-w-[520px] items-center gap-3 rounded-[16px] bg-ink py-1 pr-2 pl-4 text-bg shadow-toast"
    >
      <span className="flex-1 text-[15px] font-medium">{es.pwa.nueva}</span>
      <button
        type="button"
        onClick={() => setHayNueva(false)}
        className="h-10 px-2 text-[14px] text-bg/80"
      >
        {es.pwa.despues}
      </button>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="h-10 rounded-[12px] px-3 text-[15px] font-bold text-sun"
      >
        {es.pwa.actualizar}
      </button>
    </div>
  )
}
