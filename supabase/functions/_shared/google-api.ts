// Llamadas a la API de Google (OAuth y Calendar) con fetch.
import type { GoogleEvent } from './gcal.ts'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CAL = 'https://www.googleapis.com/calendar/v3'

export class GoogleError extends Error {
  constructor(
    public status: number,
    public detalle: string,
  ) {
    super(`Google ${status}: ${detalle}`)
  }
}

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new GoogleError(r.status, await r.text())
  return (r.status === 204 ? {} : await r.json()) as T
}

export interface Credenciales {
  clientId: string
  clientSecret: string
}

export async function canjearCodigo(c: Credenciales, code: string, redirectUri: string) {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  return json<{ access_token: string; refresh_token?: string; id_token?: string; scope: string }>(r)
}

export async function renovarAcceso(c: Credenciales, refreshToken: string): Promise<string> {
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  return (await json<{ access_token: string }>(r)).access_token
}

/** Correo del id_token (llega directo de Google por TLS en el canje del código). */
export function correoDeIdToken(idToken: string | undefined): string | null {
  try {
    const payload = JSON.parse(atob(idToken!.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

export interface PaginaEventos {
  items?: GoogleEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

export interface CalendarApi {
  listar: (
    calendarId: string,
    q: { syncToken?: string; timeMin?: string; pageToken?: string },
  ) => Promise<PaginaEventos>
  crear: (calendarId: string, ev: GoogleEvent) => Promise<GoogleEvent>
  actualizar: (calendarId: string, id: string, ev: GoogleEvent) => Promise<GoogleEvent>
  borrar: (calendarId: string, id: string) => Promise<void>
  crearCalendario: (nombre: string) => Promise<{ id: string }>
}

export function calendarApi(accessToken: string): CalendarApi {
  const h = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  const enc = encodeURIComponent
  return {
    listar: async (calendarId, q) => {
      const p = new URLSearchParams({ singleEvents: 'true', maxResults: '250' })
      if (q.syncToken) p.set('syncToken', q.syncToken)
      else if (q.timeMin) p.set('timeMin', q.timeMin)
      if (q.pageToken) p.set('pageToken', q.pageToken)
      return json(await fetch(`${CAL}/calendars/${enc(calendarId)}/events?${p}`, { headers: h }))
    },
    crear: async (calendarId, ev) =>
      json(
        await fetch(`${CAL}/calendars/${enc(calendarId)}/events`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify(ev),
        }),
      ),
    actualizar: async (calendarId, id, ev) =>
      json(
        await fetch(`${CAL}/calendars/${enc(calendarId)}/events/${enc(id)}`, {
          method: 'PUT',
          headers: h,
          body: JSON.stringify(ev),
        }),
      ),
    borrar: async (calendarId, id) => {
      const r = await fetch(`${CAL}/calendars/${enc(calendarId)}/events/${enc(id)}`, {
        method: 'DELETE',
        headers: h,
      })
      // 404/410: ya no existe en Google, que es lo que se quería.
      if (!r.ok && r.status !== 404 && r.status !== 410)
        throw new GoogleError(r.status, await r.text())
    },
    crearCalendario: async (nombre) =>
      json(
        await fetch(`${CAL}/calendars`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify({ summary: nombre, timeZone: 'America/Mexico_City' }),
        }),
      ),
  }
}
