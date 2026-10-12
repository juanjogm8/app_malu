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
        <h1 className="text-2xl font-semibold">{es.config.faltaTitulo}</h1>
        <p className="mt-3 text-muted">{es.config.faltaTexto}</p>
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
