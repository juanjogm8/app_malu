// "state" de OAuth firmado con HMAC-SHA256: liga la vuelta de Google a la persona que la pidió.
const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const deB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function clave(secreto: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function firmar<T>(datos: T, secreto: string, segundos = 600): Promise<string> {
  const cuerpo = b64url(
    new TextEncoder().encode(JSON.stringify({ d: datos, exp: Date.now() + segundos * 1000 })),
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', await clave(secreto), new TextEncoder().encode(cuerpo)),
  )
  return `${cuerpo}.${b64url(sig)}`
}

export async function verificar<T>(token: string, secreto: string): Promise<T | null> {
  const [cuerpo, sig] = token.split('.')
  if (!cuerpo || !sig) return null
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await clave(secreto),
      deB64url(sig),
      new TextEncoder().encode(cuerpo),
    )
    if (!ok) return null
    const { d, exp } = JSON.parse(new TextDecoder().decode(deB64url(cuerpo)))
    return exp > Date.now() ? (d as T) : null
  } catch {
    return null
  }
}
