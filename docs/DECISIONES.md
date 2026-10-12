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
