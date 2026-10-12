// Notificaciones push (Web Push con VAPID). Secretos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
import webpush from 'npm:web-push@3.6.7'
import type { clienteAdmin } from './admin.ts'

type Admin = ReturnType<typeof clienteAdmin>

export interface Aviso {
  title: string
  body: string
  url?: string
  tag?: string
}

const pub = Deno.env.get('VAPID_PUBLIC_KEY')
const priv = Deno.env.get('VAPID_PRIVATE_KEY')
export const pushConfigurado = Boolean(pub && priv)
if (pushConfigurado)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:casa@example.com', pub!, priv!)

/** Ids de personas con al menos un dispositivo suscrito. */
export async function conPush(admin: Admin): Promise<Set<string>> {
  if (!pushConfigurado) return new Set()
  const { data } = await admin.from('push_subscriptions').select('member_id')
  return new Set((data ?? []).map((r) => r.member_id as string))
}

/** Manda el aviso a todos los dispositivos de la persona; borra los que ya no existen. */
export async function enviarPush(admin: Admin, memberId: string, aviso: Aviso) {
  if (!pushConfigurado) return
  const { data } = await admin.from('push_subscriptions').select('*').eq('member_id', memberId)
  for (const s of data ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(aviso),
        { TTL: 6 * 60 * 60 },
      )
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410)
        await admin.from('push_subscriptions').delete().eq('id', s.id)
      else console.error('push', status, e)
    }
  }
}
