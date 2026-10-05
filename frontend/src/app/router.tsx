import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/layout/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { Activity } from 'lucide-react'
import { KitPage } from './KitPage'
import { RequireAuth } from './guards/RequireAuth'
import { PublicOnly } from './guards/PublicOnly'
import { AuthInitializer } from './guards/AuthInitializer'
import { AuthLayout } from './pages/auth/AuthLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'

// Placeholders for lazily loaded routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="max-w-7xl mx-auto">
    <PageHeader title={title} />
    <EmptyState 
      icon={Activity}
      title="Coming Soon"
      description={`This page (${title}) will be implemented in a future phase.`}
    />
  </div>
)

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
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Placeholder title="Dashboard" /> },
      { path: 'assessment/new', element: <Placeholder title="New Assessment" /> },
      { path: 'assessment/:patientId', element: <Placeholder title="View/Edit Patient" /> },
      { path: 'analysis', element: <Placeholder title="Select Patient for Analysis" /> },
      { path: 'analysis/:patientId', element: <Placeholder title="Analysis Report" /> },
      { path: 'records', element: <Placeholder title="Patient Records" /> },
      { path: 'records/:patientId', element: <Placeholder title="Patient Details" /> },
      { path: 'model-info', element: <Placeholder title="Model Information" /> },
      { path: '_kit', element: <KitPage /> },
      { path: '*', element: <Placeholder title="404 Not Found" /> },
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
