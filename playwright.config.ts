import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  // El service worker de la PWA se salta las rutas simuladas: se bloquea en las pruebas.
  use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
  projects: [
    {
      name: 'movil',
      use: {
        ...devices['Pixel 7'],
        // Permite usar un Chromium ya instalado (p. ej. en contenedores sin descarga).
        launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
      },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    env: {
      // Supabase falso: alcanza para probar las pantallas sin sesión.
      VITE_SUPABASE_URL: 'http://127.0.0.1:9',
      VITE_SUPABASE_ANON_KEY: 'prueba',
    },
  },
})
