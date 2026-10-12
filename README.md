# Casa en Orden

App web instalable (PWA) y privada para organizar la casa entre dos personas: pendientes, calendario,
súper, compras, mejoras del hogar, comidas, niños, fechas importantes, planes y notas.

- Especificación: [`docs/SPEC.md`](docs/SPEC.md) · Decisiones: [`docs/DECISIONES.md`](docs/DECISIONES.md)
- Configurar cuentas (Supabase, Google, Vercel): [`docs/PASOS-DEL-USUARIO.md`](docs/PASOS-DEL-USUARIO.md)

**Stack:** Vite + React 19 + TypeScript estricto · Tailwind CSS v4 sobre tokens CSS · TanStack Query ·
React Router · Supabase (Postgres, Auth con Google, Realtime) · Vercel.

## Estado

| Fase                                            | Estado                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| 0 · Cimientos                                   | ✅ código listo; falta configurar cuentas ([pasos](docs/PASOS-DEL-USUARIO.md)) |
| 1 · Paridad con el prototipo                    | ⏳ espera `docs/prototipo.html` y la entrega de Claude Design                  |
| 2 · Telegram · 3 · Google Calendar · 4 · Pulido | —                                                                              |

## Desarrollo local

Requisitos: Node 22 y pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # llena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
pnpm dev                     # http://localhost:5173
```

Para usar una Supabase local en lugar del proyecto real (requiere Docker):

```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...   # cliente OAuth con origen localhost:5173
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
pnpm dlx supabase start      # imprime la URL y la anon key locales para .env.local
pnpm dlx supabase db reset   # vuelve a aplicar migraciones y semillas locales
```

## Comandos

| Comando                                        | Qué hace                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                     | Servidor de desarrollo                                                                                         |
| `pnpm build`                                   | Revisa tipos y construye en `dist/`                                                                            |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Calidad                                                                                                        |
| `pnpm test`                                    | Pruebas unitarias (Vitest)                                                                                     |
| `pnpm test:sql`                                | Migraciones + pruebas de RLS y `complete_task` en un Postgres desechable (usa `initdb` local o `DATABASE_URL`) |
| `pnpm test:e2e`                                | Humo con Playwright (`PW_CHROMIUM_PATH` para usar un Chromium ya instalado)                                    |

## Estructura

```
docs/                 especificación, decisiones, pasos del usuario
design/               entrega de Claude Design (tokens, capturas)
src/app/              router, layout, encabezado, barra inferior, sesión
src/features/         una carpeta por vista
src/components/       componentes compartidos
src/lib/              lógica pura y cliente de Supabase
src/styles/           tokens.css (fuente de verdad) e index.css (Tailwind)
src/i18n/es.ts        todos los textos
supabase/migrations/  SQL versionado
tests/                unit · sql · e2e
```

## Variables y secretos

- Cliente (`.env.local`, nunca en el repo): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- La `service_role` y los secretos de Telegram y Google solo viven en Supabase (Edge Functions).

## Acceso

Solo dos correos pueden entrar (lista `allowed_emails`). El alta la valida el trigger
`handle_new_user` y todas las tablas tienen RLS que exige ser miembro.
