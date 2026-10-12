import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/app/auth'
import { CACHE_BUSTER, persister, queryClient } from '@/app/cache'
import { router } from '@/app/router'
import { ActualizarApp } from '@/components/ActualizarApp'
import { Pantalla } from '@/components/Pantalla'
import { es } from '@/i18n/es'
import { supabaseConfigured } from '@/lib/supabase'

export function App() {
  if (!supabaseConfigured) {
    return (
      <Pantalla>
        <div className="flex flex-1 flex-col justify-center gap-3 px-7">
          <h1 className="font-display text-[30px] leading-[1.1] font-normal">
            {es.config.faltaTitulo}
          </h1>
          <p className="text-muted">{es.config.faltaTexto}</p>
        </div>
      </Pantalla>
    )
  }
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: CACHE_BUSTER,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' },
      }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
        <ActualizarApp />
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}
