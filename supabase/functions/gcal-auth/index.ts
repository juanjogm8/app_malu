// Conexión con Google Calendar (OAuth 2.0, código de autorización con acceso sin conexión).
//   POST {escritura?: boolean} con el JWT de la persona → { url } para mandarla a Google.
//   GET ?code&state (vuelta de Google) → guarda el token en Vault, sincroniza y regresa a la app.
// Secretos: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DIGEST_SECRET (firma el state), APP_URL.
import { clienteAdmin } from '../_shared/admin.ts'
import { firmar, verificar } from '../_shared/firma.ts'
import { SCOPE_ESCRITURA, SCOPE_LECTURA } from '../_shared/gcal.ts'
import { calendarApi, canjearCodigo, correoDeIdToken } from '../_shared/google-api.ts'
import { credenciales, sincronizar } from '../gcal-sync/sincronizar.ts'

const admin = clienteAdmin()
const SECRETO = Deno.env.get('DIGEST_SECRET')!
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
const REDIRECT = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gcal-auth`
const CORS = {
  'Access-Control-Allow-Origin': APP_URL || '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
const volver = (estado: string) => Response.redirect(`${APP_URL}/mas/ajustes?google=${estado}`, 302)

interface Estado {
  m: string
  w: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  if (req.method === 'POST') {
    const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const { data } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
    const user = data.user
    if (!user) return Response.json({ error: 'no autorizado' }, { status: 401, headers: CORS })
    const { data: miembro } = await admin
      .from('members')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (!miembro) return Response.json({ error: 'no autorizado' }, { status: 403, headers: CORS })
    let escritura = false
    try {
      escritura = (await req.json())?.escritura === true
    } catch {
      /* sin cuerpo */
    }
    const state = await firmar<Estado>({ m: user.id, w: escritura }, SECRETO)
    const p = new URLSearchParams({
      client_id: credenciales().clientId,
      redirect_uri: REDIRECT,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      login_hint: user.email ?? '',
      scope: ['openid', 'email', SCOPE_LECTURA, ...(escritura ? [SCOPE_ESCRITURA] : [])].join(' '),
      state,
    })
    return Response.json(
      { url: `https://accounts.google.com/o/oauth2/v2/auth?${p}` },
      { headers: CORS },
    )
  }

  // Vuelta de Google
  const u = new URL(req.url)
  if (u.searchParams.get('error')) return volver('cancelado')
  const estado = await verificar<Estado>(u.searchParams.get('state') ?? '', SECRETO)
  const code = u.searchParams.get('code')
  if (!estado || !code) return volver('error')
  try {
    const t = await canjearCodigo(credenciales(), code, REDIRECT)
    if (!t.refresh_token) return volver('error')
    const puedeEscribir = estado.w && t.scope.includes(SCOPE_ESCRITURA)
    await admin.from('google_accounts').upsert({
      member_id: estado.m,
      google_email: correoDeIdToken(t.id_token) ?? '',
      can_write: puedeEscribir,
      status: 'ok',
      last_error: null,
    })
    const { error } = await admin.rpc('gcal_guardar_token', {
      p_member: estado.m,
      p_token: t.refresh_token,
    })
    if (error) throw error
    if (puedeEscribir) {
      const { data: a } = await admin
        .from('app_settings')
        .select('gcal_calendar_id, gcal_writer_id')
        .maybeSingle()
      let calendarId = a?.gcal_writer_id === estado.m ? a?.gcal_calendar_id : null
      if (!calendarId)
        calendarId = (await calendarApi(t.access_token).crearCalendario('Casa en Orden')).id
      await admin
        .from('app_settings')
        .update({ gcal_calendar_id: calendarId, gcal_writer_id: estado.m })
        .eq('id', true)
      // Lo ya publicado con otra cuenta se vuelve a publicar en este calendario.
      if (a?.gcal_writer_id !== estado.m) {
        await admin
          .from('events')
          .update({ google_event_id: null, google_etag: null, google_synced_at: null })
          .not('id', 'is', null)
      }
    }
    await sincronizar(admin, estado.m)
    return volver('ok')
  } catch (e) {
    console.error(e)
    return volver('error')
  }
})
