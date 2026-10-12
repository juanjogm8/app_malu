// Lógica del webhook del bot, con dependencias inyectadas para poder probarla.
import { mismoSecreto } from '../_shared/telegram-api.ts'
import type { CalendarData } from '../_shared/calendario.ts'
import type { Member, ShoppingItem } from '../_shared/db.ts'
import {
  AYUDA,
  parseCommand,
  parsePendiente,
  textoHoy,
  textoSemana,
  textoSuper,
} from '../_shared/telegram-texto.ts'

export interface Deps {
  secreto: string | undefined
  hoy: () => string
  miembroPorChat: (chatId: number) => Promise<Member | null>
  /** Usa el código y guarda el chat; devuelve la persona o null si el código no sirve. */
  vincular: (codigo: string, chatId: number) => Promise<Member | null>
  miembros: () => Promise<Member[]>
  calendario: () => Promise<CalendarData>
  superItems: () => Promise<ShoppingItem[]>
  agregarSuper: (texto: string, memberId: string) => Promise<'nuevo' | 'ya-esta' | 'volvio'>
  crearPendiente: (texto: string, due: string | null, memberId: string) => Promise<void>
  enviar: (chatId: number, html: string) => Promise<unknown>
}

interface Update {
  message?: { chat: { id: number; type?: string }; text?: string }
}

const ok = () => new Response('ok')

export async function manejar(req: Request, d: Deps): Promise<Response> {
  if (req.method !== 'POST') return new Response('método no permitido', { status: 405 })
  if (!mismoSecreto(req.headers.get('x-telegram-bot-api-secret-token'), d.secreto)) {
    return new Response('no autorizado', { status: 401 })
  }
  let update: Update
  try {
    update = await req.json()
  } catch {
    return ok()
  }
  const msg = update.message
  if (!msg?.text) return ok()
  const chatId = msg.chat.id
  const c = parseCommand(msg.text)

  // Vincular: /start CÓDIGO (desde la app, menú de la cuenta → Telegram).
  if (c?.cmd === 'start') {
    const codigo = c.args.trim().toUpperCase()
    const ya = await d.miembroPorChat(chatId)
    if (!codigo) {
      await d.enviar(
        chatId,
        ya
          ? AYUDA
          : 'Para conectar este chat, abre Casa en Orden → tu cuenta → Telegram y sigue los pasos.',
      )
      return ok()
    }
    const m = await d.vincular(codigo, chatId)
    await d.enviar(
      chatId,
      m
        ? `Listo, ${primerNombre(m)}. Este chat ya está conectado a Casa en Orden.\n\n${AYUDA}`
        : 'Ese código no sirve o ya caducó. Genera uno nuevo en la app (tu cuenta → Telegram).',
    )
    return ok()
  }

  // Todo lo demás solo para chats vinculados; los demás se ignoran.
  const yo = await d.miembroPorChat(chatId)
  if (!yo || !c) return ok()
  const ctx = async () => ({
    data: await d.calendario(),
    members: await d.miembros(),
    today: d.hoy(),
  })

  switch (c.cmd) {
    case 'hoy': {
      await d.enviar(chatId, textoHoy(await ctx(), null) ?? 'Nada para hoy. 🌤')
      break
    }
    case 'semana': {
      await d.enviar(
        chatId,
        textoSemana(await ctx(), null) ?? 'Nada programado en los próximos 7 días.',
      )
      break
    }
    case 'super':
    case 'agregar': {
      const texto = c.args.slice(0, 120)
      if (!texto) {
        await d.enviar(
          chatId,
          c.cmd === 'super'
            ? textoSuper(await d.superItems())
            : 'Escribe qué agregar: /agregar leche',
        )
        break
      }
      const r = await d.agregarSuper(texto, yo.id)
      await d.enviar(
        chatId,
        r === 'nuevo'
          ? `Agregué <b>${esc(texto)}</b> al súper.`
          : r === 'volvio'
            ? `<b>${esc(texto)}</b> volvió a la lista.`
            : `<b>${esc(texto)}</b> ya está en la lista.`,
      )
      break
    }
    case 'pendiente': {
      const p = parsePendiente(c.args, d.hoy())
      if (!p) {
        await d.enviar(chatId, 'Escribe el pendiente: /pendiente pagar predial 15/11')
        break
      }
      await d.crearPendiente(p.text, p.due, yo.id)
      await d.enviar(
        chatId,
        `Anotado: <b>${esc(p.text)}</b>${p.due ? ` para el ${p.due.slice(8, 10)}/${p.due.slice(5, 7)}` : ''}.`,
      )
      break
    }
    default:
      await d.enviar(chatId, AYUDA)
  }
  return ok()
}

const primerNombre = (m: Member) => (m.name || m.email).trim().split(/\s+/)[0]
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
