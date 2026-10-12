# Pasos que te tocan a ti

Lo que Claude no puede hacer por ti: crear cuentas y proyectos, y pegar llaves. Ve en orden.
Al final de cada paso viene **qué deberías ver** y **cómo comprobarlo**.

> Los nombres de menús de Supabase, Google Cloud y Vercel cambian a veces. Si algo no coincide,
> busca la opción con un nombre parecido o pregúntale a Claude.

## Resumen: qué hacer y en qué orden

| # | Qué | Para qué | ¿Obligatorio? |
|---|---|---|---|
| 1–7 | Supabase, Google (inicio de sesión), migraciones, Vercel | Que la app funcione | Sí |
| 8 | Instalar en los celulares | Usarla como app | Recomendado |
| 9 | Bot de Telegram | Resúmenes y `/agregar leche` | Opcional |
| 10 | Google Calendar | Ver sus calendarios de Google en la app | Opcional |
| 11 | Notificaciones push | Avisos del teléfono además de Telegram | Opcional |

Valores que vas a ir juntando (guárdalos en un lugar seguro, **nunca** en el repositorio):

| Nombre | De dónde sale |
|---|---|
| `SUPABASE_URL` | Paso 1 |
| `SUPABASE_ANON_KEY` | Paso 1 |
| `PROJECT_REF` | Paso 1 (la parte `xxxx` de `https://xxxx.supabase.co`) |
| `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` | Paso 2 |
| `URL_VERCEL` | Paso 5 (p. ej. `https://casa-en-orden.vercel.app`) |

---

## 1. Crear el proyecto de Supabase

1. Entra a <https://supabase.com/dashboard> e inicia sesión (puedes usar tu cuenta de GitHub).
2. **New project**. Nombre: `casa-en-orden`. Contraseña de la base: genera una fuerte y guárdala.
   Región: **East US (North Virginia)**. Plan: Free.
3. Espera a que termine de crearse (uno o dos minutos).
4. Ve a **Project Settings → API** (o **Data API**) y copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key (o "publishable key") → `SUPABASE_ANON_KEY`

**Qué deberías ver:** el panel del proyecto con el estado "Healthy".
**Comprobación:** `SUPABASE_URL` se ve como `https://xxxx.supabase.co`.

## 2. Crear el cliente de Google para iniciar sesión

1. Primero copia la **Callback URL** de Supabase: **Authentication → Sign In / Providers → Google**.
   Se ve como `https://xxxx.supabase.co/auth/v1/callback`. No guardes nada todavía.
2. Entra a <https://console.cloud.google.com/> y crea un proyecto nuevo: `Casa en Orden`.
3. Ve a **Google Auth Platform** (antes "Pantalla de consentimiento de OAuth") → **Get started**:
   - Nombre de la app: `Casa en Orden`. Correo de asistencia: el tuyo.
   - Público (**Audience**): **External**.
   - Contacto: tu correo. Acepta y crea.
4. En **Audience**, pulsa **Publish app** para pasarla a **In production**. Solo pide nombre, correo y
   foto (alcances básicos), así que Google no exige verificación; y en modo "Testing" los inicios de
   sesión caducan a los 7 días. Si prefieres dejarla en Testing, agrega los dos correos como *test users*.
5. En **Clients → Create client**:
   - Tipo: **Web application**. Nombre: `Supabase`.
   - **Authorized JavaScript origins:** `http://localhost:5173` (agregarás `URL_VERCEL` en el paso 6).
   - **Authorized redirect URIs:** la Callback URL del punto 1.
   - Crea y copia **Client ID** y **Client secret**.
6. De vuelta en Supabase (**Authentication → Sign In / Providers → Google**): activa **Enable**, pega
   Client ID y Client secret y guarda.

**Qué deberías ver:** Google aparece como "Enabled" en la lista de proveedores.

## 3. Cerrar la puerta: correos autorizados y registro

Los dos correos (`juanjogamur@gmail.com` y `m.rm91@hotmail.com`) ya vienen en las migraciones; se
cargan en el paso 4. Aquí solo apagas lo que sobra:

1. **Authentication → Sign In / Providers → Email**: desactívalo (solo queda Google).
2. **Authentication → Sign In / Providers → User Signups**: deja **Allow new users to sign up**
   **encendido por ahora**. Si lo apagas antes de que las dos personas entren una vez, Supabase no
   las deja entrar. Lo apagas en el paso 7.

> Mientras el registro esté encendido, cualquier correo que no esté en la lista es rechazado por la
> base de datos al intentar entrar. Nadie más puede crear una cuenta.

## 4. Aplicar las migraciones

Desde la carpeta del repositorio, en tu computadora (necesitas Node 22 y pnpm):

```bash
pnpm install
pnpm dlx supabase login                       # abre el navegador para autorizar
pnpm dlx supabase link --project-ref PROJECT_REF   # te pide la contraseña de la base (paso 1)
pnpm dlx supabase db push                     # muestra las migraciones y pide confirmación
```

**Qué deberías ver:** la lista de 6 migraciones (`acceso`, `tablas`, `rls_realtime`,
`complete_task`, `ajustes`, `paleta_persona`) y "Finished supabase db push".
**Comprobación:** en **Table Editor** aparecen `tasks`, `events`, `members`, etc., y cada tabla dice
"RLS enabled". En **SQL Editor**, `select * from allowed_emails;` muestra los dos correos.

## 5. Publicar en Vercel

1. Entra a <https://vercel.com/new> con tu cuenta de GitHub e importa el repositorio `app_malu`.
2. Framework: **Vite** (lo detecta solo). Build command y output: los de siempre (`pnpm build`, `dist`).
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = `SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` = `SUPABASE_ANON_KEY`
4. **Deploy**. Al terminar, copia el dominio de producción → `URL_VERCEL`.

**Qué deberías ver:** la pantalla "Casa en Orden · Entrar con Google" en `URL_VERCEL`.

## 6. Permitir el dominio de producción

1. Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `URL_VERCEL`
   - **Redirect URLs:** `URL_VERCEL`, `URL_VERCEL/**` y `http://localhost:5173`.
     (Opcional, para previews: `https://*-TU_EQUIPO.vercel.app/**`.)
2. Google Cloud → **Clients → Supabase → Authorized JavaScript origins:** agrega `URL_VERCEL`.

**Comprobación:**
- Entra a `URL_VERCEL` con `juanjogamur@gmail.com`: llegas a Inicio.
- Que la otra persona entre con `m.rm91@hotmail.com`: llega a Inicio.
- Entra con cualquier otra cuenta de Google: ves "Esta cuenta no está autorizada".

## 7. Apagar el registro

Cuando **las dos** personas ya entraron una vez: Supabase → **Authentication → Sign In / Providers →
User Signups** → apaga **Allow new users to sign up**.

**Comprobación:** en **Authentication → Users** hay exactamente dos usuarios.

## 8. Instalar la app en el celular

- **iPhone:** abre `URL_VERCEL` en **Safari** → botón **Compartir** → **Agregar a pantalla de inicio**.
- **Android:** abre `URL_VERCEL` en **Chrome** → menú ⋮ → **Instalar app** (o "Agregar a pantalla
  principal").

**Comprobación:** el ícono "Casa" aparece en la pantalla de inicio y la app abre sin la barra del
navegador. Con el modo avión puesto, sigue abriendo y muestra lo último que se cargó; lo que anoten
queda "Por enviar" y se manda solo al volver la señal.

## 9. Telegram (fase 2)

Necesitas el paso 4 hecho (migraciones aplicadas) y la app publicada (paso 5).

### 9.1 Crear el bot
1. En Telegram abre **@BotFather** y mándale `/newbot`.
2. Nombre: `Casa en Orden`. Usuario: uno libre que termine en `bot` (p. ej. `casa_en_orden_tuapellido_bot`).
3. BotFather te da un **token** (`123456:ABC…`) → `TELEGRAM_BOT_TOKEN`. Guárdalo.
4. (Opcional) Mándale `/setcommands`, elige tu bot y pega:
   ```
   hoy - Lo de hoy y lo atrasado
   semana - Los próximos 7 días
   super - La lista del súper (o /super leche para agregar)
   agregar - Agrega al súper: /agregar leche
   pendiente - Crea un pendiente: /pendiente pagar predial 15/11
   ```

### 9.2 Secretos y funciones
Genera dos secretos al azar (uno para el webhook y otro para los resúmenes):
```bash
openssl rand -hex 32   # → TELEGRAM_WEBHOOK_SECRET
openssl rand -hex 32   # → DIGEST_SECRET
```
Guárdalos en Supabase y publica las funciones:
```bash
pnpm dlx supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... DIGEST_SECRET=... APP_URL=URL_VERCEL
pnpm dlx supabase functions deploy telegram-webhook --no-verify-jwt
pnpm dlx supabase functions deploy digest --no-verify-jwt
```
**Qué deberías ver:** "Deployed Functions … telegram-webhook" y "… digest". En el panel, **Edge Functions**
muestra las dos.

### 9.3 Conectar el webhook
```bash
curl "https://api.telegram.org/botTELEGRAM_BOT_TOKEN/setWebhook" \
  -d url=https://PROJECT_REF.supabase.co/functions/v1/telegram-webhook \
  -d secret_token=TELEGRAM_WEBHOOK_SECRET \
  -d 'allowed_updates=["message"]'
```
**Comprobación:** `curl "https://api.telegram.org/botTELEGRAM_BOT_TOKEN/getWebhookInfo"` muestra tu URL
y `"pending_update_count": 0`, sin `last_error_message`.

### 9.4 Programar los resúmenes
La migración ya programó una llamada cada hora con `pg_cron`. Solo falta decirle a dónde llamar. En
**SQL Editor** de Supabase:
```sql
select vault.create_secret('https://PROJECT_REF.supabase.co', 'casa_project_url');
select vault.create_secret('DIGEST_SECRET', 'casa_digest_secret');
```
**Comprobación:** `select jobname, schedule from cron.job;` muestra `casa-en-orden-resumenes` con
`0 * * * *`. Una hora después, `select status, return_message from cron.job_run_details order by
start_time desc limit 3;` muestra `succeeded`.

### 9.5 Botón "Abrir Telegram" en la app (opcional)
En Vercel → **Settings → Environment Variables** agrega `VITE_TELEGRAM_BOT` = el usuario del bot (sin
@) y vuelve a publicar (**Deployments → Redeploy**).

### 9.6 Vincular a cada persona
Cada quien, en la app: avatar → **Ajustes · Telegram** → **Conectar Telegram**, y le manda al bot el
mensaje `/start CÓDIGO` que aparece (o toca **Abrir Telegram**).

**Comprobación:**
- El bot responde "Listo, Juanjo. Este chat ya está conectado…".
- `/agregar leche` en el chat → la leche aparece en el súper de la otra persona al instante.
- Para probar el resumen sin esperar a las 8:00:
  ```bash
  curl -X POST https://PROJECT_REF.supabase.co/functions/v1/digest \
    -H "x-digest-secret: DIGEST_SECRET" -d '{"forzar":"diario"}'
  ```

## 10. Google Calendar (fase 3)

Usa el mismo proyecto de Google Cloud del paso 2.

### 10.1 Habilitar la API y los permisos
1. Google Cloud → **APIs & Services → Library** → busca **Google Calendar API** → **Enable**.
2. **Google Auth Platform → Data Access → Add or remove scopes** y agrega (pega en "Manually add
   scopes"):
   - `https://www.googleapis.com/auth/calendar.events.readonly` (leer tus eventos)
   - `https://www.googleapis.com/auth/calendar.app.created` (solo para el calendario compartido que
     crea la app; no toca tus otros calendarios)
   Guarda.
3. **Audience:** confirma que dice **In production** (paso 2.4). En modo "Testing" Google caduca el
   permiso cada 7 días.
4. **Clients → Supabase → Authorized redirect URIs:** agrega
   `https://PROJECT_REF.supabase.co/functions/v1/gcal-auth` y guarda.

> Estos permisos son "sensibles" para Google. Sin verificar la app, al conectar verán
> **"Google no ha verificado esta app"**: toquen **Configuración avanzada → Ir a Casa en Orden (no
> seguro)**. Es normal en una app privada; el límite de Google sin verificar es de 100 usuarios en toda
> la vida del proyecto y ustedes son dos. Verificarla no hace falta.

### 10.2 Secretos y funciones
```bash
pnpm dlx supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...
pnpm dlx supabase functions deploy gcal-auth --no-verify-jwt
pnpm dlx supabase functions deploy gcal-sync --no-verify-jwt
```
(`DIGEST_SECRET` y `APP_URL` ya quedaron del paso 9.2; si te saltaste Telegram, defínelos igual.)

La sincronización cada minuto ya quedó programada por la migración y usa los secretos de Vault del
paso 9.4. **Comprobación:** `select jobname, schedule from cron.job;` muestra también
`casa-en-orden-google` con `* * * * *`.

### 10.3 Conectar (cada persona)
App → avatar → **Ajustes · Telegram** → **Google Calendar** → **Conectar mi Google Calendar**.

**Comprobación:** al volver aparece "Google Calendar conectado", y en **Calendario** hay una capa nueva
**Google** con tus eventos (círculo hueco de tu color). Un evento nuevo en Google aparece en la app en
un minuto como máximo. Para no esperar:
```bash
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/gcal-sync -H "x-digest-secret: DIGEST_SECRET"
```

### 10.4 Calendario compartido (opcional, una sola persona)
1. En **Ajustes → Google Calendar** toca **Publicar los eventos de la app** y acepta el permiso extra.
   La app crea en tu Google un calendario **Casa en Orden** y publica ahí todos los eventos de la app.
2. En Google Calendar (web): **Casa en Orden → Configuración y compartir → Compartir con personas** →
   agrega el correo de la otra persona con permiso "Ver todos los detalles".

**Comprobación:** un evento creado en la app aparece en "Casa en Orden" de Google en un minuto como
máximo, y no aparece duplicado en la capa Google de la app.
También se publica lo de **Niños** que tenga fecha (por ejemplo "Vacuna · Mateo").

## 11. Notificaciones push (fase 4, opcional)

Telegram es el canal principal; las notificaciones del teléfono son un extra con los mismos
resúmenes.

1. Genera las llaves (una sola vez):
   ```bash
   pnpm exec web-push generate-vapid-keys
   ```
   Te da una **Public Key** y una **Private Key**.
2. Guárdalas:
   ```bash
   pnpm dlx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:juanjogamur@gmail.com
   pnpm dlx supabase functions deploy digest --no-verify-jwt
   ```
   En Vercel agrega `VITE_VAPID_PUBLIC_KEY` = la **Public Key** y vuelve a publicar.
3. En cada teléfono: avatar → **Ajustes · Telegram** → **Notificaciones en este teléfono** → **Activar**.
   - **iPhone:** solo funciona con la app instalada en la pantalla de inicio (Safari → Compartir →
     Agregar a pantalla de inicio) y con iOS 16.4 o más reciente. Abre la app desde el ícono y activa
     ahí.
   - **Android:** funciona en Chrome, instalada o no.

**Comprobación:** con el `curl` de prueba del paso 9.6 (`{"forzar":"diario"}`) llega una notificación
"Revisa tu día". Al tocarla se abre la app.
