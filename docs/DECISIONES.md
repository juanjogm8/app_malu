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
