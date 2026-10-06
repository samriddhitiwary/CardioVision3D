import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'

import { KitPage } from './KitPage'
import { RequireAuth } from './guards/RequireAuth'
import { PublicOnly } from './guards/PublicOnly'
import { AuthInitializer } from './guards/AuthInitializer'
import { AuthLayout } from './pages/auth/AuthLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { lazy } from 'react'
import { ActivePatientProvider } from '../features/patients/ActivePatientContext'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })))
const RecordsPage = lazy(() => import('./pages/RecordsPage').then(module => ({ default: module.RecordsPage })))
const RecordsDetailPage = lazy(() => import('./pages/RecordsDetailPage').then(module => ({ default: module.RecordsDetailPage })))
const AssessmentPage = lazy(() => import('./pages/AssessmentPage').then(module => ({ default: module.AssessmentPage })))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage').then(module => ({ default: module.AnalysisPage })))
import { NotFoundPage } from './pages/NotFoundPage'
import { ValidPatientIdGuard } from './guards/ValidPatientIdGuard'



const router = createBrowserRouter([
  // Auth Routes (Public Only)
  {
    element: <PublicOnly><AuthLayout /></PublicOnly>,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ]
  },
  
  // App Routes (Protected)
  {
    path: '/',
    element: (
      <RequireAuth>
        <ActivePatientProvider>
          <AppShell />
        </ActivePatientProvider>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Suspense fallback={<div className="p-8">Loading...</div>}><DashboardPage /></Suspense> },
      { path: 'assessment/new', element: <Suspense fallback={<div className="p-8">Loading...</div>}><AssessmentPage /></Suspense> },
      { path: 'assessment/:patientId', element: <ValidPatientIdGuard><Suspense fallback={<div className="p-8">Loading...</div>}><AssessmentPage /></Suspense></ValidPatientIdGuard> },
      { path: 'analysis', element: <Suspense fallback={<div className="p-8">Loading...</div>}><AnalysisPage /></Suspense> },
      { path: 'analysis/:patientId', element: <ValidPatientIdGuard><Suspense fallback={<div className="p-8">Loading...</div>}><AnalysisPage /></Suspense></ValidPatientIdGuard> },
      { path: 'records', element: <Suspense fallback={<div className="p-8">Loading...</div>}><RecordsPage /></Suspense> },
      { path: 'records/:id', element: <ValidPatientIdGuard paramName="id"><Suspense fallback={<div className="p-8">Loading...</div>}><RecordsDetailPage /></Suspense></ValidPatientIdGuard> },
      ...(import.meta.env.DEV ? [{ path: '_kit', element: <KitPage /> }] : []),
      { path: '*', element: <NotFoundPage /> },
    ]
  }
])

export function AppRouter() {
  return (
    <AuthInitializer>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--bg)]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div></div>}>
        <RouterProvider router={router} />
      </Suspense>
    </AuthInitializer>
  )
}
