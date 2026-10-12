// Núcleo de la sincronización con Google Calendar, con dependencias inyectadas para probarlo.
import type { CalendarEvent } from './db.ts'
import { addDays } from './fechas.ts'
import { eventoAGoogle, googleAFila } from './gcal.ts'
import type { FilaGoogle } from './gcal.ts'
import { GoogleError } from './google-api.ts'
import type { CalendarApi } from './google-api.ts'

export interface AlmacenLectura {
  leerSyncToken: (memberId: string, calendarId: string) => Promise<string | null>
  guardarSyncToken: (memberId: string, calendarId: string, token: string | null) => Promise<void>
  /** Borra todo lo copiado de ese calendario (sincronización completa tras un 410). */
  vaciar: (memberId: string, calendarId: string) => Promise<void>
  guardar: (filas: FilaGoogle[]) => Promise<void>
  borrar: (memberId: string, calendarId: string, googleIds: string[]) => Promise<void>
}

/**
 * Sincroniza un calendario: incremental con syncToken; completa (desde hace 30 días) si no hay token
 * o si Google responde 410 (token caducado). Devuelve cuántos cambios aplicó.
 */
export async function sincronizarLectura(
  api: CalendarApi,
  almacen: AlmacenLectura,
  memberId: string,
  calendarId: string,
  hoy: string,
): Promise<number> {
  let syncToken = await almacen.leerSyncToken(memberId, calendarId)
  const completa = async () => {
    await almacen.vaciar(memberId, calendarId)
    syncToken = null
  }
  if (!syncToken) await completa()
  let cambios = 0
  let pageToken: string | undefined
  for (let intento = 0; intento < 2; intento++) {
    try {
      do {
        const pagina = await api.listar(
          calendarId,
          syncToken
            ? { syncToken, pageToken }
            : { timeMin: `${addDays(hoy, -30)}T00:00:00Z`, pageToken },
        )
        const guardar: FilaGoogle[] = []
        const quitar: string[] = []
        for (const g of pagina.items ?? []) {
          const fila = googleAFila(g, memberId, calendarId)
          // No se guarda lo que está a más de un año (las repeticiones sin fin se expanden mucho).
          if (fila && fila.date <= addDays(hoy, 366)) guardar.push(fila)
          else if (g.id) quitar.push(g.id)
        }
        if (guardar.length) await almacen.guardar(guardar)
        if (quitar.length) await almacen.borrar(memberId, calendarId, quitar)
        cambios += guardar.length + quitar.length
        pageToken = pagina.nextPageToken
        if (!pageToken && pagina.nextSyncToken)
          await almacen.guardarSyncToken(memberId, calendarId, pagina.nextSyncToken)
      } while (pageToken)
      return cambios
    } catch (e) {
      if (e instanceof GoogleError && e.status === 410 && intento === 0) {
        await completa()
        pageToken = undefined
        continue
      }
      throw e
    }
  }
  return cambios
}

export interface AlmacenEscritura {
  pendientes: () => Promise<CalendarEvent[]>
  marcarPublicado: (eventId: string, googleId: string, etag: string | null) => Promise<void>
  borradosPendientes: () => Promise<string[]>
  quitarBorrado: (googleId: string) => Promise<void>
}

/** Paso 2: publica en el calendario compartido lo que cambió en la app y borra lo eliminado. */
export async function publicar(api: CalendarApi, almacen: AlmacenEscritura, calendarId: string) {
  let publicados = 0
  for (const id of await almacen.borradosPendientes()) {
    await api.borrar(calendarId, id)
    await almacen.quitarBorrado(id)
  }
  for (const ev of await almacen.pendientes()) {
    const recurso = eventoAGoogle(ev)
    let g
    try {
      g = ev.google_event_id
        ? await api.actualizar(calendarId, ev.google_event_id, recurso)
        : await api.crear(calendarId, recurso)
    } catch (e) {
      // Si lo borraron a mano en Google, se vuelve a crear.
      if (
        e instanceof GoogleError &&
        (e.status === 404 || e.status === 410) &&
        ev.google_event_id
      ) {
        g = await api.crear(calendarId, recurso)
      } else throw e
    }
    await almacen.marcarPublicado(ev.id, g.id!, g.etag ?? null)
    publicados++
  }
  return publicados
}
