import axios from "axios"
import { authStore } from "../features/auth/authStore"
import { authApi } from "../features/auth/authApi"
import { toast } from "sonner"
import { queryClient } from "./queryClient"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Single-flight refresh state
let refreshPromise: Promise<string> | null = null

http.interceptors.request.use(
  (config) => {
    const token = authStore.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 && 
      originalRequest && 
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/')
    ) {
      originalRequest._retry = true
      const refreshToken = authStore.getRefreshToken()

      if (!refreshToken) {
        handleSessionExpired()
        return Promise.reject(error)
      }

      if (!refreshPromise) {
        refreshPromise = authApi.refresh(refreshToken)
          .then((tokens) => {
            const profile = authStore.getState().profile
            authStore.setSession(tokens.access_token, tokens.refresh_token, profile || undefined)
            return tokens.access_token
          })
          .catch((refreshError) => {
            handleSessionExpired()
            return Promise.reject(refreshError)
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      try {
        const newAccessToken = await refreshPromise
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return http(originalRequest)
      } catch (err) {
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)

function handleSessionExpired() {
  authStore.clearSession()
  queryClient.clear()
  
  // Only redirect and toast if we are not already on login/register
  if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
    toast.error("Your session expired, please sign in again")
    const nextUrl = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?next=${nextUrl}`
  }
}
