/// <reference lib="webworker" />
/* Service worker de Casa en Orden: caché del shell (Workbox) y notificaciones push. */
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

// Tipografías de Google: se guardan para abrir sin conexión con su letra.
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'fuentes',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 31536000 })],
  }),
)

// "Hay una versión nueva · Actualizar"
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
clientsClaim()

interface Aviso {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (e) => {
  let datos: Aviso
  try {
    datos = e.data?.json() ?? {}
  } catch {
    datos = { body: e.data?.text() }
  }
  e.waitUntil(
    self.registration.showNotification(datos.title ?? 'Casa en Orden', {
      body: datos.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: datos.tag,
      lang: 'es-MX',
      data: { url: datos.url ?? '/' },
    }),
  )
})

// Al tocar el aviso: enfoca la app si ya está abierta o la abre en la vista indicada.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL((e.notification.data as { url?: string })?.url ?? '/', self.location.origin)
    .href
  e.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const abierta = ventanas.find((w) => w.url.startsWith(self.location.origin))
      if (abierta) {
        await abierta.focus()
        await abierta.navigate(url)
      } else await self.clients.openWindow(url)
    })(),
  )
})
