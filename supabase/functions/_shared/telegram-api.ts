// Envío de mensajes por la API de bots de Telegram.
export async function enviarTelegram(
  token: string,
  chatId: number,
  html: string,
): Promise<boolean> {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }),
  })
  if (!r.ok) console.error('Telegram respondió', r.status, await r.text())
  return r.ok
}

/** Compara secretos sin filtrar su longitud ni contenido por tiempos. */
export function mismoSecreto(a: string | null, b: string | undefined): boolean {
  if (!a || !b) return false
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}
