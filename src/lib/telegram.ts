/*
 * Textos y reglas del bot de Telegram (fase 2). Puro: lo usan las Edge Functions (copia en
 * supabase/functions/_shared/telegram-texto.ts) y se prueba con Vitest.
 * Formato: HTML de Telegram (<b>, <i>); todo texto del usuario pasa por esc().
 */
import type { Member, ShoppingItem } from '@/types/db'
import { ALL_BUT_MEALS, entriesInRange, KIND_LABEL } from './calendario'
import type { CalendarData, Entry } from './calendario'
import { CATS } from './categorias'
import { addDays, fDay, fLong, fShort, fTime, fWdShort, parse } from './fechas'
import { ageAt, dateInfos, dateTitle, isApproaching, whenLabel } from './fechas-importantes'
import { overdueTasks } from './pendientes'
import { REPEAT_NAME } from './recurrencia'

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* ---------- Comandos ---------- */

export interface Comando {
  cmd: string
  args: string
}

/** "/agregar@CasaBot leche" → { cmd: 'agregar', args: 'leche' }; null si no es comando. */
export function parseCommand(text: string): Comando | null {
  const m = /^\/([a-záéíóúñ]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i.exec(text.trim())
  if (!m) return null
  return { cmd: m[1]!.toLowerCase(), args: (m[2] ?? '').trim() }
}

/**
 * "pagar predial 15/11" → { text: 'pagar predial', due: '2026-11-15' }.
 * Acepta dd/mm o dd/mm/aaaa al final; si dd/mm ya pasó este año, usa el siguiente.
 */
export function parsePendiente(
  args: string,
  today: string,
): { text: string; due: string | null } | null {
  const m = /^(.*?)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(args.trim())
  let text = args.trim()
  let due: string | null = null
  if (m) {
    const d = Number(m[2])
    const mo = Number(m[3])
    const y = m[4] ? Number(m[4].length === 2 ? `20${m[4]}` : m[4]) : Number(today.slice(0, 4))
    const valida = (yy: number) => {
      const iso = `${yy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dt = parse(iso)
      return dt.getUTCMonth() + 1 === mo && dt.getUTCDate() === d ? iso : null
    }
    let iso = mo >= 1 && mo <= 12 && d >= 1 ? valida(y) : null
    if (iso && !m[4] && iso < today) iso = valida(y + 1)
    if (iso) {
      text = m[1]!.trim()
      due = iso
    }
  }
  if (!text) return null
  return { text: text.slice(0, 120), due }
}

/* ---------- Para quién es cada cosa ---------- */

/** Lo de "Ambos" o sin responsable llega a las dos personas; lo de una persona, solo a ella. */
export const esPara = (personId: string | null, shared: boolean, memberId: string) =>
  shared || !personId || personId === memberId

const filtrar = (data: CalendarData, memberId: string): CalendarData => ({
  ...data,
  events: data.events.filter((e) => esPara(e.owner_id, e.is_shared, memberId)),
  tasks: data.tasks.filter((t) => esPara(t.assignee_id, t.is_shared, memberId)),
  // Lo de Google Calendar es de cada quien.
  google: data.google?.filter((g) => g.member_id === memberId),
})

/* ---------- Textos ---------- */

type Quien = (personId: string | null, shared: boolean) => string

/** Nombres relativos a quien recibe el mensaje: "tú", el nombre de la otra persona o "Ambos". */
export function quienPara(
  members: Pick<Member, 'id' | 'name' | 'email'>[],
  memberId: string,
): Quien {
  return (personId, shared) => {
    if (shared) return 'Ambos'
    if (!personId) return 'Sin asignar'
    if (personId === memberId) return 'tú'
    const m = members.find((x) => x.id === personId)
    return m ? (m.name || m.email).trim().split(/\s+/)[0]! : 'Pareja'
  }
}

function linea(e: Entry, quien: Quien, conDia = false): string {
  const partes: string[] = []
  if (conDia) partes.push(fDay(e.date).replace(/^(\S{3})\S*/, '$1'))
  if (e.time) partes.push(fTime(e.time))
  const cuando = partes.length ? `${partes.join(' ')} · ` : ''
  const extra: string[] = []
  if (e.kind === 'evento' || e.kind === 'pendiente') extra.push(quien(e.personId, e.shared))
  if (e.kind === 'google') extra.push('Google')
  if (e.extra) extra.push(e.extra)
  if (e.repeat) extra.push(REPEAT_NAME[e.repeat].toLowerCase())
  const etiqueta = e.kind === 'evento' || e.kind === 'google' ? '' : `${KIND_LABEL[e.kind]}: `
  return `• ${esc(cuando)}${esc(etiqueta)}<b>${esc(e.title)}</b>${extra.length ? ` <i>(${esc(extra.join(', '))})</i>` : ''}`
}

const seccion = (titulo: string, lineas: string[]) =>
  lineas.length ? [`\n<b>${titulo}</b>`, ...lineas].join('\n') : ''

interface Contexto {
  data: CalendarData
  members: Pick<Member, 'id' | 'name' | 'email'>[]
  today: string
}

/** Hoy y lo atrasado (comando /hoy y resumen diario). memberId = null muestra lo de los dos. */
export function textoHoy(
  { data, members, today }: Contexto,
  memberId: string | null,
): string | null {
  const d = memberId ? filtrar(data, memberId) : data
  const quien = quienPara(members, memberId ?? '')
  const hoy = entriesInRange(d, today, today, ALL_BUT_MEALS).get(today) ?? []
  const atrasados = overdueTasks(d.tasks, today)
  const fechas = dateInfos(d.dates, today).filter(isApproaching)
  const comidas = d.meals
    .filter((m) => m.date === today && m.text)
    .sort(
      (a, b) =>
        ['desayuno', 'comida', 'cena'].indexOf(a.meal) -
        ['desayuno', 'comida', 'cena'].indexOf(b.meal),
    )

  const partes = [
    seccion(
      'Hoy',
      hoy.map((e) => linea(e, quien)),
    ),
    seccion(
      'Atrasados',
      atrasados.map(
        (t) =>
          `• <b>${esc(t.text)}</b> <i>(venció el ${fShort(t.due_date!)}, ${esc(quien(t.assignee_id, t.is_shared))})</i>`,
      ),
    ),
    seccion(
      'Fechas que se acercan',
      fechas.map((x) => {
        const edad = ageAt(x)
        return `• <b>${esc(dateTitle(x.item))}</b> <i>(${whenLabel(x.days).toLowerCase()}, ${fWdShort(x.next).toLowerCase()}${edad ? `, cumple ${edad}` : ''})</i>`
      }),
    ),
    seccion(
      'Comidas de hoy',
      comidas.map(
        (m) =>
          `• ${m.meal === 'desayuno' ? 'Desayuno' : m.meal === 'comida' ? 'Comida' : 'Cena'}: <b>${esc(m.text!)}</b>`,
      ),
    ),
  ].filter(Boolean)
  return partes.length ? partes.join('\n').trim() : null
}

/** Próximos 7 días a partir de `desde` (comando /semana y resumen del domingo). */
export function textoSemana(
  { data, members, today }: Contexto,
  memberId: string | null,
  desde: string = addDays(today, 1),
): string | null {
  const d = memberId ? filtrar(data, memberId) : data
  const quien = quienPara(members, memberId ?? '')
  const mapa = entriesInRange(d, desde, addDays(desde, 6), ALL_BUT_MEALS)
  const lineas: string[] = []
  for (let i = 0; i < 7; i++) {
    const dia = addDays(desde, i)
    const es_ = mapa.get(dia)
    if (!es_?.length) continue
    lineas.push(`\n<b>${fDay(dia)}</b>`, ...es_.map((e) => linea(e, quien)))
  }
  return lineas.length ? lineas.join('\n').trim() : null
}

export function textoSuper(items: ShoppingItem[]): string {
  const pendientes = items.filter((i) => !i.done)
  if (!pendientes.length) return 'La lista del súper está vacía.'
  const partes = [`<b>Súper</b> · faltan ${pendientes.length}`]
  for (const [cat, nombre] of CATS) {
    const de = pendientes.filter((i) => i.category === cat)
    if (de.length) partes.push(`\n<b>${nombre}</b>`, ...de.map((i) => `• ${esc(i.text)}`))
  }
  return partes.join('\n')
}

export function resumenDiario(
  ctx: Contexto,
  member: Pick<Member, 'id' | 'name' | 'email'>,
): string | null {
  const cuerpo = textoHoy(ctx, member.id)
  if (!cuerpo) return null
  const nombre = (member.name || member.email).trim().split(/\s+/)[0]
  return `<b>Buenos días, ${esc(nombre!)}</b> · ${fLong(ctx.today)}\n\n${cuerpo}`
}

export function resumenSemanal(
  ctx: Contexto,
  member: Pick<Member, 'id' | 'name' | 'email'>,
  appUrl: string,
): string {
  const desde = addDays(ctx.today, 1)
  const cuerpo = textoSemana(ctx, member.id, desde)
  const titulo = `<b>La semana que viene</b> · ${fShort(desde)} – ${fShort(addDays(desde, 6))}`
  const revision = `\n\n¿Ya hicieron la revisión de la semana? Son 10 minutos: ${esc(appUrl.replace(/\/$/, ''))}/revision`
  return `${titulo}\n\n${cuerpo ?? 'Nada programado todavía.'}${revision}`
}

export const AYUDA = [
  '<b>Casa en Orden</b> · lo que puedo hacer:',
  '/hoy — lo de hoy y lo atrasado',
  '/semana — los próximos 7 días',
  '/super — la lista del súper',
  '/agregar leche — agrega al súper (también /super leche)',
  '/pendiente pagar predial 15/11 — crea un pendiente (la fecha es opcional)',
].join('\n')

/** Texto plano para una notificación push a partir del HTML del resumen. */
export function avisoPush(html: string, maxLineas = 4): { title: string; body: string } {
  const plano = html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
  const [primera, ...resto] = plano.split('\n').filter((l) => l.trim())
  const lineas = resto.filter((l) => l.startsWith('•'))
  const extra = lineas.length > maxLineas ? `\n…y ${lineas.length - maxLineas} más` : ''
  return {
    title: (primera ?? 'Casa en Orden').trim(),
    body: lineas.slice(0, maxLineas).join('\n') + extra || resto.slice(0, maxLineas).join('\n'),
  }
}
