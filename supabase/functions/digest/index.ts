// Resúmenes programados. Secretos: TELEGRAM_BOT_TOKEN, DIGEST_SECRET, APP_URL.
import { cargarAjustes, cargarCalendario, cargarMiembros, clienteAdmin } from '../_shared/admin.ts'
import { enviarTelegram } from '../_shared/telegram-api.ts'
import { manejarDigest } from './manejar.ts'

const admin = clienteAdmin()
const token = Deno.env.get('TELEGRAM_BOT_TOKEN')!

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
    enviar: (chatId, html) => enviarTelegram(token, chatId, html),
  }),
)
