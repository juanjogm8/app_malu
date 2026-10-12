import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { AuthProvider } from '@/app/auth'
import { router } from '@/app/router'
import { Pantalla } from '@/components/Pantalla'
import { es } from '@/i18n/es'
import { supabaseConfigured } from '@/lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
