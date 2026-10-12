/* eslint-disable react-refresh/only-export-components -- proveedor y hooks van juntos */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@/components/Icon'
import { es } from '@/i18n/es'

/** Cuánto dura un aviso con Deshacer (SPEC §8: 6 s). */
export const TOAST_MS = 6000

interface ToastOpts {
  action?: { label: string; fn: () => void }
  /** Palomita en círculo cempasúchil (completar una rutina). */
  check?: boolean
}
interface ToastState extends ToastOpts {
  id: number
  msg: string
  error?: boolean
}
interface ToastApi {
  show: (msg: string, opts?: ToastOpts) => void
  error: (msg: string, retry?: () => void) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const seq = useRef(0)

  const show = useCallback<ToastApi['show']>((msg, opts) => {
    setToast({ id: ++seq.current, msg, ...opts })
  }, [])
  const error = useCallback<ToastApi['error']>((msg, retry) => {
    setToast({
      id: ++seq.current,
      msg,
      error: true,
      action: retry ? { label: es.datos.reintentar, fn: retry } : undefined,
    })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast])

  const api = useMemo(() => ({ show, error }), [show, error])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 z-50 mx-auto max-w-[520px] bottom-[calc(var(--nav-h)+12px)]"
      >
        {toast && (
          <div
            key={toast.id}
            role={toast.error ? 'alert' : 'status'}
            className={`toast-in pointer-events-auto flex min-h-[54px] items-center gap-3 rounded-[16px] py-1 pr-2 shadow-toast ${
              toast.error
                ? 'border-[1.5px] border-danger bg-danger-soft pl-[14px] text-danger'
                : `bg-ink text-bg ${toast.check ? 'pl-3' : 'pl-4'}`
            }`}
          >
            {toast.error && <Icon name="alerta" size={18} />}
            {toast.check && (
              <span className="grid size-[26px] flex-none place-items-center rounded-full bg-sun text-sun-ink">
                <Icon name="palomita" size={15} stroke={3} />
              </span>
            )}
            <span className={`flex-1 text-[15px] ${toast.error ? 'font-semibold' : 'font-medium'}`}>
              {toast.msg}
            </span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.fn()
                  setToast(null)
                }}
                className={`h-10 rounded-[12px] px-[14px] text-[15px] font-bold ${
                  toast.error ? 'underline underline-offset-3' : 'text-sun'
                }`}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
