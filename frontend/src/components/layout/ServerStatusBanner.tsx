import { useState, useEffect } from "react"
import { AlertCircle, Cpu } from "lucide-react"
import { http } from "../../lib/http"
import type { HealthResponse } from "../../types/api"

export function ServerStatusBanner() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [isDown, setIsDown] = useState(false)

  useEffect(() => {
    let cancelled = false
    
    const checkHealth = async () => {
      // Only poll when tab is visible
      if (document.hidden) return
      
      try {
        const response = await http.get<HealthResponse>('/health')
        if (!cancelled) {
          setHealth(response.data)
          setIsDown(false)
        }
      } catch (err) {
        if (!cancelled) {
          setIsDown(true)
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkHealth()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  if (isDown) {
    return (
      <div className="bg-[var(--danger)] text-white text-xs font-medium px-4 py-2 flex items-center justify-center">
        <AlertCircle className="w-4 h-4 mr-2" />
        Can't reach the server. Please check your connection.
      </div>
    )
  }

  if (health && !health.models_loaded) {
    return (
      <div className="bg-[var(--warning)] text-white text-xs font-medium px-4 py-2 flex items-center justify-center">
        <Cpu className="w-4 h-4 mr-2" />
        AI models are currently loading in the background. Analysis features may be temporarily unavailable.
      </div>
    )
  }

  return null
}
