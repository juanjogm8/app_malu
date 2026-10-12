import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Realtime mantiene los datos al día; al abrir la app con datos guardados de hace más de
      // 30 s se vuelven a leer.
      staleTime: 30_000,
      // Lo guardado en el dispositivo dura una semana.
      gcTime: 7 * 24 * 60 * 60 * 1000,
    },
  },
})

/** Caché de TanStack Query en IndexedDB: sin conexión se ve lo último que se cargó. */
export const persister = createAsyncStoragePersister({
  key: 'casa-en-orden:cache',
  storage: {
    getItem: async (k) => (await get<string>(k)) ?? null,
    setItem: (k, v) => set(k, v),
    removeItem: (k) => del(k),
  },
  throttleTime: 1000,
})

/** Versión del formato guardado; cambiarla descarta las cachés viejas. */
export const CACHE_BUSTER = 'v1'
