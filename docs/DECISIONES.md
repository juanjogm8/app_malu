# Decisiones

Registro de decisiones relevantes: qué, por qué y qué alternativas había.

## 2026-10-12 · Fase 0

### Hosting: subdominio gratuito de Vercel
- **Qué:** la app vive en `https://<proyecto>.vercel.app`.
- **Por qué:** lo eligió el usuario; sin costo ni configuración de DNS. Un dominio propio se puede agregar después sin tocar código (solo URLs permitidas en Supabase y Google).

### Región de Supabase: East US (North Virginia, `us-east-1`)
- **Por qué:** la latencia desde CDMX es similar a US West (~50 ms) y `us-east-1` es la región con más capacidad y servicios. El usuario dejó la elección a Claude.
- **Alternativa:** West US (North California).

### Datos del prototipo: empezar de cero
- **Qué:** no se escribe `scripts/importar-prototipo.ts` (SPEC §15).
- **Por qué:** lo decidió el usuario.

### Tema: automático y con interruptor manual
- **Qué:** por defecto sigue a `prefers-color-scheme`; en el menú de la cuenta se puede fijar Claro u Oscuro. Se guarda en el navegador (`localStorage`, clave `casa:tema`) y se aplica como `<html data-theme>` antes de pintar.
- **Por qué:** lo pidió el usuario. Es una preferencia del dispositivo, no de la cuenta, así que no va a la base de datos.

### Resúmenes de Telegram: flag apagado
- **Qué:** tabla `app_settings` (una sola fila) con `telegram_digest_per_person = false`. Apagado = los resúmenes llegan a las dos personas siempre. Encendido = cada quien elige en Ajustes (fase 2).
- **Por qué:** el usuario quiere decidir después; el flag ya existe para no necesitar una migración al encenderlo.

### Correos autorizados en una migración
- **Qué:** `20261012000001_acceso.sql` inserta `juanjogamur@gmail.com` y `m.rm91@hotmail.com` en `allowed_emails`.
- **Por qué:** el usuario dio los correos; así la base queda lista al aplicar migraciones, sin pasos manuales. No son datos de ejemplo: son la lista de acceso real. Cambiarla después requiere una migración nueva (o un `insert` desde el editor SQL de Supabase).

### Registro abierto en Supabase: orden de configuración
- **Qué:** se deshabilita el proveedor de correo y solo queda Google. La opción "Allow new users to sign up" se deja **encendida hasta que las dos personas entren una vez** y después se apaga.
- **Por qué:** con esa opción apagada, Supabase tampoco crea usuarios nuevos por Google, así que nadie podría entrar la primera vez. Mientras está encendida, el trigger `handle_new_user` rechaza cualquier correo fuera de `allowed_emails` (y la RLS protege los datos aunque algo fallara). Al apagarla quedan las dos defensas que pide la SPEC.

### Permisos más estrictos que la SPEC en `members`, `allowed_emails` y tablas de la app
- **Qué:** además de la RLS: `allowed_emails` sin ningún permiso para `anon`/`authenticated`; en `members` solo `select` y `update (name, color, avatar_url)`; las tablas de la app sin permisos para `anon`; `color` es único (los dos colores nunca coinciden).
- **Por qué:** con solo la política "editar mi fila", una persona podría cambiar su propio `email` o `telegram_chat_id` (que en la fase 2 decide quién recibe mensajes).

### `complete_task`: rotación con un solo miembro
- **Qué:** si `rotate` está activo y aún no existe la otra persona, el responsable se queda igual (`coalesce`). El borrador de la SPEC lo dejaba en `null`.

### TypeScript 6.0 (no 7)
- **Por qué:** `typescript-eslint` todavía no soporta TS 7. Se puede subir cuando lo soporte.

### Pruebas SQL sin Docker
- **Qué:** `tests/sql/run.sh` levanta un Postgres desechable (o usa `DATABASE_URL`), carga una réplica mínima de lo que trae Supabase (`tests/sql/00_supabase_stub.sql`: roles, `auth.users`, `auth.uid()`, publicación realtime) y corre migraciones y pruebas.
- **Por qué:** corre en segundos, en CI y en entornos sin Docker. Las pruebas contra Supabase local completo (`supabase start`) quedan para los E2E de la fase 1.

### Tokens de diseño provisionales
- **Qué:** `src/styles/tokens.css` tiene una paleta provisional (verde `#0A6B58` y naranja `#C2410C` como colores de persona, de la SPEC). Tailwind v4 lee esos tokens con `@theme inline`.
- **Por qué:** el prototipo y la entrega de Claude Design aún no están en el repositorio. Al llegar se reemplaza `tokens.css`.

## 2026-10-12 · Fase 1b · Pantallas principales (diseño 2b)

Criterio general (lo pide el README del diseño): **la SPEC manda en lo funcional y el diseño en lo
visual**. Donde chocan:

| Tema | Diseño | SPEC | Se hizo |
|---|---|---|---|
| Navegación | Barra con Más; Mejoras como 3.ª pestaña de Listas | Barra con **Casa**; Más en el encabezado; Listas = Súper y Compras | SPEC. Mejoras vive en `/casa` con el aspecto de la pantalla "Mejoras" del diseño. Más es un botón de 44 px (⋯) entre el estado de conexión y el avatar. |
| Ícono de Casa | — (no existe) | — | Llave de herramienta, mismo trazo que los demás. |
| Encabezado en Listas | Súper y Compras no lo muestran | — | Se muestra en todas las vistas para no perder Más, el estado de conexión ni la cuenta. |
| Duración del aviso con Deshacer | 4 s | 6 s | 6 s (SPEC). |
| Aviso "Sin conexión" | "Pueden seguir anotando; se envía solo al volver la señal" | Fase 1 bloquea la escritura; la cola llega en la fase 4 | Texto cambiado: "Pueden ver todo; para guardar cambios esperen a que vuelva la señal". |
| Color de entradas sin responsable (fechas, niños, planes, comidas) | Punto partido "Ambos" | Acento | Diseño (punto partido). Pendientes "Sin asignar": punto gris (`--muted`). |
| Próximos 7 días en Inicio | El ejemplo incluye una comida | Todas las capas menos comidas (prototipo) | SPEC/prototipo: sin comidas. |
| Semana del calendario | Sin botón por día | "+" por día | Botón "+" de 44 px bajo el número del día. |
| Compras | Solo se ven pendientes | "Por comprar" y "Comprado" | Ambos grupos; los comprados van tachados y sin píldora de prioridad. |
| Chip de "Fechas que se acercan" | Ámbar a 5 días, neutro a 12 | — | Ámbar si faltan 7 días o menos; neutro si faltan más. |

### Colores de persona
- `members.color` guarda el id de la paleta (`azul`, `ciruela`, `jade`, `teja`, `ocre`, `rosa`),
  no un hex: cada color tiene versión clara y oscura en `tokens.css`. La app copia el color de cada
  quien a `--person-a` / `--person-b` (A = la cuenta que entró primero).
- Por defecto A = Azul y B = Teja. En el menú de la cuenta cada quien elige su color, limitado al
  grupo contrario al de la otra persona (frío / cálido), como pide el diseño para deuteranopía.

### Capa de datos
- Cada tabla se lee completa (son pocos registros) y se mantiene al día con un canal de Realtime
  para todas las tablas. Al reconectar se vuelve a leer todo.
- Escrituras optimistas con reversión si fallan y aviso "No se pudo guardar · Reintentar".
- Eliminar siempre deja "Eliminado · Deshacer", que vuelve a insertar con el mismo `id` (también
  al limpiar comprados o hechos).

### Pruebas E2E sin Supabase
- `tests/e2e/supabase-falso.ts` simula PostgREST en memoria, `complete_task` y el WebSocket de
  Realtime (incluida la retransmisión entre pestañas). Cubre los flujos 1, 2, 3 y 5 de la SPEC
  §16. El flujo 4 (comidas → súper) llega con la pantalla de Comidas.

### Tamaño del paquete
- Las vistas (salvo Inicio) se cargan al abrirlas. El paquete principal pesa ~185 KB comprimido,
  casi todo React, supabase-js y React Router. La PWA (siguiente entrega) lo deja en caché.

## 2026-10-12 · Fase 1c · Organización y PWA

- **Subvistas de Más:** siguen el diseño y cambian el encabezado por "‹ Más". La Revisión lleva su
  propio encabezado (cerrar · fecha).
- **Revisión:** en domingo planea la semana que empieza mañana; otro día, la semana en curso.
  "Lo que se atoró" incluye pendientes y cosas de los niños vencidas, ambos con Hecho y +1 semana.
  El cierre "Semana en orden" resume lo hecho en esa sesión.
- **Notas:** el pie dice "De {persona} · {fecha de la última edición}". La tabla no guarda quién
  editó por última vez, solo quién creó la nota.
- **Ícono de la app provisional** (`public/icons/icono.svg`, se regenera con `node scripts/iconos.mjs`):
  el diseño final del ícono quedó para la tercera ronda de Claude Design.
- **Sin conexión (fase 1):** la caché de TanStack Query se guarda en IndexedDB (`idb-keyval`, una
  semana) y se borra al cerrar sesión. El service worker guarda el shell y las tipografías. La
  escritura se bloquea con aviso; la cola de escrituras llega en la fase 4.
- **Actualizaciones:** `registerType: 'prompt'` con el aviso "Hay una versión nueva · Actualizar";
  revisa cada hora mientras la app está abierta.

## 2026-10-12 · Fase 2 · Telegram

- **Vinculación:** la app genera un código de 8 caracteres (RPC `create_telegram_link_code`, dura 15
  minutos, uno vigente por persona). `/start CÓDIGO` guarda el `telegram_chat_id`; un chat solo puede
  pertenecer a una persona. Los chats no vinculados se ignoran (salvo `/start`, que explica cómo
  conectar).
- **A quién llega qué:** lo de una persona solo a esa persona; lo de "Ambos" o sin responsable, a
  las dos. Los comandos `/hoy` y `/semana` muestran lo de los dos (quien pregunta ve todo).
- **Resúmenes:** `pg_cron` llama a `digest` cada hora en punto (UTC); la función calcula la hora de
  la Ciudad de México y decide. Con el flag apagado: diario 8:00 y semanal domingo 19:00 para los
  dos. Encendido: cada quien elige en Ajustes. El diario no se manda si no hay nada que contar.
  `telegram_digest_log` impide duplicados en el mismo día. La URL y el secreto que usa `pg_cron` se
  guardan en Supabase Vault.
- **Seguridad:** las funciones no usan el JWT de Supabase (Telegram no lo manda); validan su propio
  encabezado secreto comparándolo en tiempo constante. La `service_role` solo vive en las funciones.
- **Lógica compartida:** `pnpm sync:shared` copia a `supabase/functions/_shared` las fechas,
  recurrencias, calendario, fechas importantes, pendientes, súper y textos del bot, reescribiendo
  las importaciones para Deno. Las funciones se prueban con `pnpm test:functions` (Deno) y se revisan
  sus tipos con `pnpm check:functions`.

## 2026-10-12 · Fase 3 · Google Calendar

Verificado con la documentación vigente de Google:

- **Alcances mínimos:** lectura con `calendar.events.readonly`; escritura con
  `calendar.app.created`, que solo permite crear calendarios propios de la app y manejar sus eventos
  (no toca los demás calendarios). Ambos son "sensibles".
- **Publicación "In production" sin verificar:** en "Testing" los refresh tokens caducan a los 7 días
  (salvo que solo se pidan nombre, correo y perfil). Sin verificar, Google muestra "Google no ha
  verificado esta app" y aplica un tope de 100 usuarios nuevos en toda la vida del proyecto; para dos
  personas basta. No se pide verificación.
- **OAuth propio (no el de Supabase Auth):** `gcal-auth` arma la URL con `access_type=offline` y
  `prompt=consent` (para recibir siempre el refresh token) y un `state` firmado con HMAC que liga la
  vuelta a la persona. El refresh token se guarda cifrado en **Supabase Vault**
  (`gcal_guardar_token` / `gcal_leer_token`, solo para la service_role) y nunca llega al navegador.
- **Lectura:** solo el calendario principal de cada persona, `singleEvents=true` y sincronización
  incremental con `syncToken`. La primera vez lee desde hace 30 días. Si Google responde 410 se borra lo
  copiado y se hace una sincronización completa. No se guarda nada a más de un año (las repeticiones sin
  fin se expanden mucho). Se ignoran los eventos que publicó la app (propiedad privada
  `casaEnOrdenId`), así no hay duplicados.
- **Escritura:** una persona habilita "Publicar los eventos de la app". La app crea el calendario
  "Casa en Orden" en su cuenta y publica ahí todos los eventos. La otra persona lo ve compartiéndolo
  desde Google Calendar (el alcance `calendar.app.created` no incluye permisos de compartir y no se
  pide uno más amplio). Las repeticiones se traducen a RRULE con la misma regla de la app: día 31 →
  último día del mes (`BYMONTHDAY=28,29,30,31;BYSETPOS=-1`). Los cambios en la app vuelven a marcar el
  evento como pendiente (trigger) y los borrados se guardan en `google_pending_deletes`. Si alguien
  borra a mano un evento en Google, se vuelve a crear.
- **Capa "Google" en la app:** solo lectura, círculo hueco del color de la persona dueña de la cuenta.
  Al tocar un evento se abre en Google Calendar. En los resúmenes de Telegram, a cada quien le llegan
  solo sus eventos de Google.

## 2026-10-12 · Fase 4 · Escritura sin conexión

- Sin señal (o si la red falla a medio camino) cada cambio se aplica al instante en pantalla y se
  guarda en una cola en IndexedDB (`casa-en-orden:cola`), que sobrevive a cerrar la app. Al volver la
  conexión se envía en orden y después se vuelve a leer todo.
- **Conflictos:** gana la última escritura por registro. Un cambio hecho sin conexión se aplica solo
  si el registro no cambió en el servidor después (se compara la hora local del cambio con
  `updated_at`). Si el registro ya no existe, se descarta. Altas, restauraciones y borrados son
  idempotentes (upsert por `id`).
- Completar una rutina sin conexión se calcula en el dispositivo con la misma regla que
  `complete_task` (`completarLocal`) y viaja como un cambio normal.
- Lo que solo funciona en línea (vincular Telegram o Google) sigue pidiendo conexión.
- Los registros con cambios pendientes muestran "Por enviar" (diseño 7.13) en Súper y Pendientes. El
  aviso sin conexión vuelve al texto del diseño: "Pueden seguir anotando; se envía solo al volver la
  señal".
- La cola se borra al cerrar sesión, junto con la caché.

## 2026-10-12 · Fase 4 · Notificaciones push y tableta

- **Web Push con VAPID** (`web-push` en la Edge Function `digest`). Los mismos resúmenes que
  Telegram llegan como notificación a cada dispositivo suscrito (`push_subscriptions`, una fila por
  dispositivo, cada quien maneja solo las suyas). Reciben resúmenes quienes tengan Telegram o push.
  Las suscripciones que el navegador da por muertas (404/410) se borran solas. Al tocar el aviso se
  abre la app (el semanal abre la Revisión).
- El service worker pasó a ser propio (`src/sw.ts`, estrategia `injectManifest`): misma caché de
  Workbox más los eventos `push` y `notificationclick`.
- **iPhone:** solo con la app instalada en la pantalla de inicio y iOS 16.4 o más reciente; Ajustes
  lo explica si no se cumple.
- **Tableta (768 px o más), según "Estados y tablet":** contenido centrado de 720 px como máximo y
  navegación de 520 px. El calendario muestra celdas de 96 px con hasta 2 títulos y "+N más". Comidas
  se vuelve una tabla de día × 3 comidas. La hoja de captura es un diálogo centrado de 560 px.
- **Medición (Lighthouse en el login, 4G lenta simulada):** accesibilidad 100, buenas prácticas 100,
  rendimiento ≥ 90. Las tipografías se cargan sin bloquear el primer pintado. `robots.txt` y
  `noindex`: la app es privada y no debe aparecer en buscadores.

## Niños ↔ calendario (después de la entrega)

- **Campo "Niño" en los eventos** (`events.kid`, opcional, con sugerencias de los nombres ya usados).
  Un evento con niño aparece también en **Niños**, en el grupo "En el calendario", con su próxima
  fecha (los que se repiten muestran la siguiente). Se ve con el filtro "Todo" y se filtra por niño;
  al tocarlo se edita como evento. En el calendario su subtítulo agrega el nombre ("Evento · Ambos · Sofi").
- **Lo de Niños con fecha se publica en Google** (calendario "Casa en Orden"), igual que los eventos:
  título "Vacuna · Mateo" (el nombre no se repite si el título ya lo trae), sin repetición. Marcarlo
  hecho no lo quita de Google; quitarle la fecha o borrarlo, sí. Los eventos con niño también llevan
  el nombre en el título que se publica.
