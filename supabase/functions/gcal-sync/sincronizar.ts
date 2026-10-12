// Sincroniza las cuentas conectadas (lectura) y publica en el calendario compartido (escritura).
import { clienteAdmin } from '../_shared/admin.ts'
import type { AppSettings, CalendarEvent, KidItem } from '../_shared/db.ts'
import { today } from '../_shared/fechas.ts'
import { publicar, sincronizarLectura } from '../_shared/gcal-sync-core.ts'
import { eventoAGoogle, ninoAGoogle } from '../_shared/gcal.ts'
import type { FilaGoogle } from '../_shared/gcal.ts'
import type { Publicable } from '../_shared/gcal-sync-core.ts'
import { calendarApi, GoogleError, renovarAcceso } from '../_shared/google-api.ts'

type Admin = ReturnType<typeof clienteAdmin>

export const credenciales = () => ({
  clientId: Deno.env.get('GOOGLE_CLIENT_ID')!,
  clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
})

async function accesoDe(admin: Admin, memberId: string): Promise<string> {
  const { data: refresh, error } = await admin.rpc('gcal_leer_token', { p_member: memberId })
  if (error || !refresh) throw new Error('Sin token guardado: vuelve a conectar Google Calendar.')
  return renovarAcceso(credenciales(), refresh as string)
}

function almacenLectura(admin: Admin) {
  return {
    leerSyncToken: async (member_id: string, calendar_id: string) => {
      const { data } = await admin
        .from('google_sync_state')
        .select('sync_token')
        .eq('member_id', member_id)
        .eq('calendar_id', calendar_id)
        .maybeSingle()
      return (data?.sync_token as string | null) ?? null
    },
    guardarSyncToken: async (member_id: string, calendar_id: string, sync_token: string | null) => {
      await admin.from('google_sync_state').upsert({ member_id, calendar_id, sync_token })
    },
    vaciar: async (member_id: string, calendar_id: string) => {
      await admin
        .from('google_events')
        .delete()
        .eq('member_id', member_id)
        .eq('calendar_id', calendar_id)
    },
    guardar: async (filas: FilaGoogle[]) => {
      const { error } = await admin.from('google_events').upsert(
        filas.map((f) => ({ ...f, updated_at: new Date().toISOString() })),
        {
          onConflict: 'member_id,calendar_id,google_event_id',
        },
      )
      if (error) throw error
    },
    borrar: async (member_id: string, calendar_id: string, ids: string[]) => {
      await admin
        .from('google_events')
        .delete()
        .eq('member_id', member_id)
        .eq('calendar_id', calendar_id)
        .in('google_event_id', ids)
    },
  }
}

function almacenEscritura(admin: Admin) {
  return {
    pendientes: async (): Promise<Publicable[]> => {
      const [eventos, ninos] = await Promise.all([
        admin.from('events').select('*').is('google_synced_at', null),
        // Lo de Niños solo se publica si tiene fecha.
        admin.from('kid_items').select('*').is('google_synced_at', null).not('date', 'is', null),
      ])
      if (eventos.error) throw eventos.error
      if (ninos.error) throw ninos.error
      return [
        ...(eventos.data as CalendarEvent[]).map((ev) => ({
          tabla: 'events' as const,
          id: ev.id,
          google_event_id: ev.google_event_id ?? null,
          recurso: eventoAGoogle(ev),
        })),
        ...(ninos.data as (KidItem & { date: string })[]).map((k) => ({
          tabla: 'kid_items' as const,
          id: k.id,
          google_event_id: k.google_event_id ?? null,
          recurso: ninoAGoogle(k),
        })),
      ]
    },
    marcarPublicado: async (p: Publicable, google_event_id: string, google_etag: string | null) => {
      await admin
        .from(p.tabla)
        .update({ google_event_id, google_etag, google_synced_at: new Date().toISOString() })
        .eq('id', p.id)
    },
    borradosPendientes: async () => {
      const { data } = await admin.from('google_pending_deletes').select('google_event_id')
      return (data ?? []).map((r) => r.google_event_id as string)
    },
    quitarBorrado: async (id: string) => {
      await admin.from('google_pending_deletes').delete().eq('google_event_id', id)
    },
  }
}

/** Sincroniza una persona (o todas si memberId es null). */
export async function sincronizar(admin: Admin, memberId: string | null) {
  let q = admin.from('google_accounts').select('member_id')
  if (memberId) q = q.eq('member_id', memberId)
  const { data: cuentas } = await q
  const resultado: Record<string, string> = {}
  for (const { member_id } of cuentas ?? []) {
    try {
      const api = calendarApi(await accesoDe(admin, member_id))
      const n = await sincronizarLectura(api, almacenLectura(admin), member_id, 'primary', today())
      await admin
        .from('google_accounts')
        .update({ status: 'ok', last_error: null, last_sync_at: new Date().toISOString() })
        .eq('member_id', member_id)
      resultado[member_id] = `${n} cambios`
    } catch (e) {
      const msg =
        e instanceof GoogleError && (e.status === 400 || e.status === 401)
          ? 'Google pidió volver a conectar la cuenta.'
          : String((e as Error).message ?? e).slice(0, 300)
      await admin
        .from('google_accounts')
        .update({ status: 'error', last_error: msg })
        .eq('member_id', member_id)
      resultado[member_id] = `error: ${msg}`
    }
  }

  // Paso 2: publicar con la cuenta de quien habilitó la escritura.
  const { data: ajustes } = await admin.from('app_settings').select('*').maybeSingle()
  const a = ajustes as AppSettings | null
  if (a?.gcal_writer_id && a.gcal_calendar_id) {
    try {
      const api = calendarApi(await accesoDe(admin, a.gcal_writer_id))
      resultado.publicados = String(
        await publicar(api, almacenEscritura(admin), a.gcal_calendar_id),
      )
    } catch (e) {
      resultado.publicados = `error: ${String((e as Error).message ?? e).slice(0, 300)}`
    }
  }
  return resultado
}
