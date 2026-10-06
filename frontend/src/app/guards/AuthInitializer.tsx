import { useEffect, useState } from "react"
import { authStore } from "../../features/auth/authStore"
import { authApi } from "../../features/auth/authApi"
import { Activity } from "lucide-react"

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = authStore.getAccessToken()
      const refreshToken = authStore.getRefreshToken()

      if (!accessToken && refreshToken) {
        try {
          const tokens = await authApi.refresh(refreshToken)
          const profile = authStore.getState().profile
          authStore.setSession(tokens.access_token, tokens.refresh_token, profile || undefined)
        } catch (error) {
          authStore.clearSession()
        }
      }
      setIsInitializing(false)
    }

    initAuth()
  }, [])

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--sidebar-bg)]">
        <Activity className="h-16 w-16 text-white animate-pulse" />
        <span className="mt-4 text-2xl font-bold tracking-tight text-white">CardioVision3D</span>
      </div>
    )
  }

  return <>{children}</>
}
