// Sincronización con Google Calendar. La llama pg_cron cada 15 minutos (encabezado x-digest-secret).
// Secretos: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DIGEST_SECRET.
import { clienteAdmin } from '../_shared/admin.ts'
import { mismoSecreto } from '../_shared/telegram-api.ts'
import { sincronizar } from './sincronizar.ts'

const admin = clienteAdmin()

Deno.serve(async (req) => {
  if (!mismoSecreto(req.headers.get('x-digest-secret'), Deno.env.get('DIGEST_SECRET'))) {
    return new Response('no autorizado', { status: 401 })
  }
  let member: string | null = null
  try {
    member = (await req.json())?.member ?? null
  } catch {
    /* sin cuerpo */
  }
  return Response.json(await sincronizar(admin, member))
})
