import { createBrowserRouter, Link, Navigate } from 'react-router'
import { Layout } from '@/app/Layout'
import { EnConstruccion } from '@/components/EnConstruccion'
import { LoginPage } from '@/features/auth/LoginPage'
import { SinAccesoPage } from '@/features/auth/SinAccesoPage'
import { MasPage } from '@/features/mas/MasPage'
import { SubvistaMas } from '@/features/mas/SubvistaMas'
import { es } from '@/i18n/es'

const t = es.titulos

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/sin-acceso', element: <SinAccesoPage /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <EnConstruccion titulo={t.inicio} /> },
      { path: 'calendario', element: <EnConstruccion titulo={t.calendario} /> },
      { path: 'pendientes', element: <EnConstruccion titulo={t.pendientes} /> },
      { path: 'listas', element: <Navigate to="/listas/super" replace /> },
      { path: 'listas/super', element: <EnConstruccion titulo={`${t.listas} · ${t.super}`} /> },
      { path: 'listas/compras', element: <EnConstruccion titulo={`${t.listas} · ${t.compras}`} /> },
      { path: 'casa', element: <EnConstruccion titulo={t.casa} /> },
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
          <section className="px-4 py-6">
            <p>{es.noEncontrado}</p>
            <Link
              to="/"
              className="mt-2 inline-flex min-h-tap items-center font-medium text-accent"
            >
              {es.irInicio}
            </Link>
          </section>
        ),
      },
    ],
  },
])
