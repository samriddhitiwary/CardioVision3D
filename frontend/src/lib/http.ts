import axios from "axios"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 20000, // 20s
  headers: {
    "Content-Type": "application/json",
  },
})

// Phase 02: Auth interceptors will be hooked up here
// http.interceptors.request.use(...)
// http.interceptors.response.use(...)
