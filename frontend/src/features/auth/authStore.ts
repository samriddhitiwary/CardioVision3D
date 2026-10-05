import { useSyncExternalStore } from "react"

interface Profile {
  email: string
  fullName?: string
}

let accessToken: string | null = null

// Read from localStorage synchronously during init
const getStoredRefreshToken = () => localStorage.getItem("cv3d.refresh")
const getStoredProfile = (): Profile | null => {
  const p = localStorage.getItem("cv3d.profile")
  return p ? JSON.parse(p) : null
}

let currentState = {
  isAuthenticated: !!accessToken,
  profile: getStoredProfile(),
}

let subscribers = new Set<() => void>()

function emit() {
  currentState = {
    isAuthenticated: !!accessToken,
    profile: getStoredProfile(),
  }
  subscribers.forEach((cb) => cb())
}

export const authStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: getStoredRefreshToken,
  getProfile: getStoredProfile,
  
  setSession: (access: string, refresh: string, profile?: Profile) => {
    accessToken = access
    localStorage.setItem("cv3d.refresh", refresh)
    if (profile) {
      localStorage.setItem("cv3d.profile", JSON.stringify(profile))
    }
    emit()
  },
  
  setProfile: (profile: Profile) => {
    localStorage.setItem("cv3d.profile", JSON.stringify(profile))
    emit()
  },
  
  clearSession: () => {
    accessToken = null
    localStorage.removeItem("cv3d.refresh")
    localStorage.removeItem("cv3d.profile")
    emit()
  },
  
  subscribe: (callback: () => void) => {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  },

  // State selector for useSyncExternalStore
  getState: () => currentState
}

// React Hook
export function useAuthStore() {
  return useSyncExternalStore(authStore.subscribe, authStore.getState)
}
