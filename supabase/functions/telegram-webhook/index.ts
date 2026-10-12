// Webhook del bot de Telegram. Secretos: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET.
import {
  agregarAlSuper,
  cargarCalendario,
  cargarMiembros,
  cargarSuper,
  clienteAdmin,
} from '../_shared/admin.ts'
import type { Member } from '../_shared/db.ts'
import { today } from '../_shared/fechas.ts'
import { enviarTelegram } from '../_shared/telegram-api.ts'
import { manejar } from './manejar.ts'

const admin = clienteAdmin()
const token = Deno.env.get('TELEGRAM_BOT_TOKEN')!

Deno.serve((req) =>
  manejar(req, {
    secreto: Deno.env.get('TELEGRAM_WEBHOOK_SECRET'),
    hoy: () => today(),
    miembroPorChat: async (chatId) => {
      const { data } = await admin
        .from('members')
        .select('*')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()
      return (data as Member | null) ?? null
    },
    vincular: async (codigo, chatId) => {
      const { data: fila } = await admin
        .from('telegram_link_codes')
        .select('member_id, expires_at')
        .eq('code', codigo)
        .maybeSingle()
      if (!fila || new Date(fila.expires_at) < new Date()) return null
      await admin.from('telegram_link_codes').delete().eq('code', codigo)
      // Un chat solo puede pertenecer a una persona.
      await admin.from('members').update({ telegram_chat_id: null }).eq('telegram_chat_id', chatId)
      const { data } = await admin
        .from('members')
        .update({ telegram_chat_id: chatId })
        .eq('id', fila.member_id)
        .select('*')
        .single()
      return (data as Member | null) ?? null
    },
    miembros: () => cargarMiembros(admin),
    calendario: () => cargarCalendario(admin),
    superItems: () => cargarSuper(admin),
    agregarSuper: (texto, memberId) => agregarAlSuper(admin, texto, memberId),
    crearPendiente: async (text, due_date, memberId) => {
      const { error } = await admin.from('tasks').insert({ text, due_date, created_by: memberId })
      if (error) throw error
    },
    enviar: (chatId, html) => enviarTelegram(token, chatId, html),
  }),
)
