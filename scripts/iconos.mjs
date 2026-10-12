// Genera los PNG de la PWA a partir de public/icons/icono.svg. Uso: node scripts/iconos.mjs
// Necesita Chromium (Playwright); PW_CHROMIUM_PATH permite usar uno ya instalado.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync('public/icons/icono.svg', 'utf8')
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
const page = await browser.newPage()
const salidas = [
  // [archivo, tamaño, escala del dibujo (maskable deja margen de seguridad del 20 %)]
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['maskable-512.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 1],
]
for (const [nombre, tam, escala] of salidas) {
  await page.setViewportSize({ width: tam, height: tam })
  await page.setContent(
    `<html><body style="margin:0;background:#1E6B4A;display:grid;place-items:center;width:${tam}px;height:${tam}px">
      <div style="width:${tam * escala}px;height:${tam * escala}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </body></html>`,
  )
  await page.screenshot({ path: `public/icons/${nombre}` })
  console.log(`✔ ${nombre}`)
}
await browser.close()
