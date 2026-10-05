import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../../features/auth/authStore"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    const nextUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${nextUrl}`} replace />
  }

  return <>{children}</>
}
