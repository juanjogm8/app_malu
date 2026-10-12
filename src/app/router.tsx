import { createBrowserRouter, Link, Navigate } from 'react-router'
import { Layout } from '@/app/Layout'
import { EnConstruccion } from '@/components/EnConstruccion'
import { LoginPage } from '@/features/auth/LoginPage'
import { SinAccesoPage } from '@/features/auth/SinAccesoPage'
import { InicioPage } from '@/features/inicio/InicioPage'
import { ListasLayout } from '@/features/listas/ListasLayout'
import { MasPage } from '@/features/mas/MasPage'
import { SubvistaMas } from '@/features/mas/SubvistaMas'
import { es } from '@/i18n/es'

const t = es.titulos

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
      { path: 'mas/comidas', element: <SubvistaMas titulo={t.comidas} /> },
      { path: 'mas/ninos', element: <SubvistaMas titulo={t.ninos} /> },
      { path: 'mas/fechas', element: <SubvistaMas titulo={t.fechas} /> },
      { path: 'mas/planes', element: <SubvistaMas titulo={t.planes} /> },
      { path: 'mas/notas', element: <SubvistaMas titulo={t.notas} /> },
      { path: 'revision', element: <EnConstruccion titulo={t.revision} /> },
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
