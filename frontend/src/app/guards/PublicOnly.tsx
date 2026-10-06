import { Navigate, useSearchParams } from "react-router-dom"
import { useAuthStore } from "../../features/auth/authStore"
import { sanitizeNextUrl } from "./utils"

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const [searchParams] = useSearchParams()

  if (isAuthenticated) {
    const nextUrl = sanitizeNextUrl(searchParams.get("next"))
    return <Navigate to={nextUrl} replace />
  }

  return <>{children}</>
}
