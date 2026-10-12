import { createBrowserRouter, Link, Navigate } from 'react-router'
import { Layout } from '@/app/Layout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SinAccesoPage } from '@/features/auth/SinAccesoPage'
import { InicioPage } from '@/features/inicio/InicioPage'
import { ListasLayout } from '@/features/listas/ListasLayout'
import { MasPage } from '@/features/organizacion/MasPage'
import { es } from '@/i18n/es'

// Inicio va en el paquete principal; las demás vistas se cargan al abrirlas.

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/sin-acceso', element: <SinAccesoPage /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <InicioPage /> },
      {
        path: 'calendario',
        lazy: () =>
          import('@/features/calendario/CalendarioPage').then((m) => ({
            Component: m.CalendarioPage,
          })),
      },
      {
        path: 'pendientes',
        lazy: () =>
          import('@/features/pendientes/PendientesPage').then((m) => ({
            Component: m.PendientesPage,
          })),
      },
      {
        path: 'listas',
        element: <ListasLayout />,
        children: [
          { index: true, element: <Navigate to="/listas/super" replace /> },
          {
            path: 'super',
            lazy: () =>
              import('@/features/listas/SuperPage').then((m) => ({ Component: m.SuperPage })),
          },
          {
            path: 'compras',
            lazy: () =>
              import('@/features/listas/ComprasPage').then((m) => ({ Component: m.ComprasPage })),
          },
        ],
      },
      {
        path: 'casa',
        lazy: () => import('@/features/casa/CasaPage').then((m) => ({ Component: m.CasaPage })),
      },
      { path: 'mas', element: <MasPage /> },
      {
        path: 'mas/comidas',
        lazy: () =>
          import('@/features/organizacion/ComidasPage').then((m) => ({ Component: m.ComidasPage })),
      },
      {
        path: 'mas/ninos',
        lazy: () =>
          import('@/features/organizacion/NinosPage').then((m) => ({ Component: m.NinosPage })),
      },
      {
        path: 'mas/fechas',
        lazy: () =>
          import('@/features/organizacion/FechasPage').then((m) => ({ Component: m.FechasPage })),
      },
      {
        path: 'mas/planes',
        lazy: () =>
          import('@/features/organizacion/PlanesPage').then((m) => ({ Component: m.PlanesPage })),
      },
      {
        path: 'mas/notas',
        lazy: () =>
          import('@/features/organizacion/NotasPage').then((m) => ({ Component: m.NotasPage })),
      },
      {
        path: 'revision',
        lazy: () =>
          import('@/features/organizacion/RevisionPage').then((m) => ({
            Component: m.RevisionPage,
          })),
      },
      {
        path: '*',
        element: (
          <section className="py-6">
            <p>{es.noEncontrado}</p>
            <Link
              to="/"
              className="mt-2 inline-flex min-h-11 items-center font-semibold text-accent"
            >
              {es.irInicio}
            </Link>
          </section>
        ),
      },
    ],
  },
])
