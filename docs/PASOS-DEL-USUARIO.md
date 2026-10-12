# Pasos que te tocan a ti

Lo que Claude no puede hacer por ti: crear cuentas y proyectos, y pegar llaves. Ve en orden.
Al final de cada paso viene **qué deberías ver** y **cómo comprobarlo**.

> Los nombres de menús de Supabase, Google Cloud y Vercel cambian a veces. Si algo no coincide,
> busca la opción con un nombre parecido o pregúntale a Claude.

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

**Qué deberías ver:** la lista de 5 migraciones (`acceso`, `tablas`, `rls_realtime`,
`complete_task`, `ajustes`) y "Finished supabase db push".
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

La instalación como app llega con la fase 1 (PWA). Cuando esté:
- **iPhone:** abre `URL_VERCEL` en **Safari** → botón **Compartir** → **Agregar a pantalla de inicio**.
- **Android:** abre `URL_VERCEL` en **Chrome** → menú ⋮ → **Instalar app**.

## 9. Telegram (fase 2)

Se detallará al empezar la fase 2: crear el bot con @BotFather, guardar `TELEGRAM_BOT_TOKEN` y
`TELEGRAM_WEBHOOK_SECRET` como secretos de Supabase y registrar el webhook.
