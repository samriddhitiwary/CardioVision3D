import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ConfirmDialog } from "../../components/ui/Dialog"
import { authApi } from "./authApi"
import { authStore } from "./authStore"
import { queryClient } from "../../lib/queryClient"
import { toast } from "sonner"

export function useLogout() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    setIsOpen(false)
    const refresh = authStore.getRefreshToken()
    
    // Clear state optimistically
    authStore.clearSession()
    queryClient.clear()
    navigate("/login", { replace: true })
    
    // Fire and forget API call
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch (err) {
        // Ignored as per spec
      }
    }
    toast.success("Successfully logged out")
  }

  const LogoutDialog = () => (
    <ConfirmDialog 
      isOpen={isOpen}
      title="Log out?"
      description="Are you sure you want to sign out of CardioVision3D?"
      variant="danger"
      onCancel={() => setIsOpen(false)}
      onConfirm={handleLogout}
      confirmText="Log out"
    />
  )

  return {
    openLogout: () => setIsOpen(true),
    LogoutDialog
  }
}
