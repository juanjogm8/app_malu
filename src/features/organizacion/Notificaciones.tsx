import { useEffect, useState } from 'react'
import { useEscritura } from '@/app/datos'
import { useToast } from '@/components/Toast'
import { Boton } from '@/components/ui'
import { es } from '@/i18n/es'
import { supabase } from '@/lib/supabase'

const t = es.notificaciones
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** Llave VAPID pública (base64url) → bytes para PushManager.subscribe. */
function llave(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const soportado = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const instalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** Notificaciones push en este dispositivo (fase 4). Telegram sigue siendo el canal principal. */
export function Notificaciones() {
  const w = useEscritura()
  const toast = useToast()
  const [activa, setActiva] = useState<boolean | null>(() => (soportado() ? null : false))
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!soportado()) return
    void navigator.serviceWorker.getRegistration().then(async (reg) => {
      setActiva(Boolean(await reg?.pushManager.getSubscription()))
    })
  }, [])

  const activar = async () => {
    if (!VAPID || !w.puedeEscribir()) return
    setOcupado(true)
    try {
      if ((await Notification.requestPermission()) !== 'granted') {
        toast.show(t.sinPermiso)
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: llave(VAPID),
      })
      const j = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          endpoint: sub.endpoint,
          p256dh: j.keys!.p256dh!,
          auth: j.keys!.auth!,
          user_agent: navigator.userAgent.slice(0, 200),
        },
        { onConflict: 'endpoint' },
      )
      if (error) throw error
      setActiva(true)
      toast.show(t.activadas)
    } catch {
      toast.error(t.error)
    } finally {
      setOcupado(false)
    }
  }

  const desactivar = async () => {
    setOcupado(true)
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    setActiva(false)
    setOcupado(false)
  }

  let cuerpo
  if (!VAPID) cuerpo = <p className="text-[14px] text-muted">{t.sinConfigurar}</p>
  else if (esIOS() && !instalada()) cuerpo = <p className="text-[14px] text-muted">{t.ios}</p>
  else if (!soportado()) cuerpo = <p className="text-[14px] text-muted">{t.noSoportado}</p>
  else
    cuerpo = activa ? (
      <Boton
        variante="secundario"
        className="self-start"
        disabled={ocupado}
        onClick={() => void desactivar()}
      >
        {t.desactivar}
      </Boton>
    ) : (
      <Boton
        className="self-start"
        disabled={ocupado || activa === null}
        onClick={() => void activar()}
      >
        {t.activar}
      </Boton>
    )

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
      <h2 className="font-display text-[22px] font-normal">{t.titulo}</h2>
      <p className="text-[14px] leading-[1.45] text-muted">{t.explicacion}</p>
      {cuerpo}
    </div>
  )
}
