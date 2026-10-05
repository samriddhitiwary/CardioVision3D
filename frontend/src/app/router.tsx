import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/layout/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { Activity } from 'lucide-react'
import { KitPage } from './KitPage'

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

const AuthPlaceholder = ({ title }: { title: string }) => (
  <div className="flex min-h-screen items-center justify-center p-4 bg-[var(--bg)]">
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold mb-4 text-center">{title}</h1>
      <EmptyState 
        icon={Activity}
        title="Coming in Phase 02"
        description={`Authentication logic will be implemented in Phase 02.`}
        action={<Link to="/" className="text-sm font-medium text-[var(--primary)] hover:underline">Go to Dashboard</Link>}
      />
    </div>
  </div>
)

const router = createBrowserRouter([
  // Auth Routes (Unguarded for now)
  { path: '/login', element: <AuthPlaceholder title="Log in" /> },
  { path: '/register', element: <AuthPlaceholder title="Register" /> },
  
  // App Routes
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Placeholder title="Dashboard" /> },
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div></div>}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
