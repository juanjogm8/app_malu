// Resúmenes programados y recordatorios de eventos por Telegram y notificaciones push.
// Secretos: DIGEST_SECRET, APP_URL; TELEGRAM_BOT_TOKEN y/o VAPID_* según los canales que usen.
import { cargarAjustes, cargarCalendario, cargarMiembros, clienteAdmin } from '../_shared/admin.ts'
import { conPush, enviarPush } from '../_shared/push.ts'
import { enviarTelegram } from '../_shared/telegram-api.ts'
import { manejarDigest } from './manejar.ts'

const admin = clienteAdmin()
const token = Deno.env.get('TELEGRAM_BOT_TOKEN')

Deno.serve((req) =>
  manejarDigest(req, {
    secreto: Deno.env.get('DIGEST_SECRET'),
    ahora: () => new Date(),
    appUrl: Deno.env.get('APP_URL') ?? '',
    ajustes: () => cargarAjustes(admin),
    miembros: () => cargarMiembros(admin),
    calendario: () => cargarCalendario(admin),
    marcar: async (member_id, kind, sent_on) => {
      const { error } = await admin.from('telegram_digest_log').insert({ member_id, kind, sent_on })
      return !error // la llave primaria rechaza el segundo envío del día
    },
    enviar: (chatId, html) =>
      token ? enviarTelegram(token, chatId, html) : Promise.resolve(false),
    conPush: () => conPush(admin),
    push: (memberId, aviso) => enviarPush(admin, memberId, aviso),
    marcarRecordatorio: async (event_id, fecha, hora, member_id) => {
      const { error } = await admin
        .from('event_reminder_log')
        .insert({ event_id, fecha, hora, member_id })
      return !error // la llave primaria rechaza el segundo envío
    },
    marcarPendiente: async (task_id, due_date, tipo, member_id) => {
      const { error } = await admin
        .from('task_reminder_log')
        .insert({ task_id, due_date, tipo, member_id })
      return !error
    },
  }),
)
