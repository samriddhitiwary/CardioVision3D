import { http } from "../../lib/http"
import type { Token } from "../../types/api"

export interface RegisterPayload {
  email: string
  password: string
  full_name?: string
}

export const authApi = {
  async login(email: string, password: string): Promise<Token> {
    const params = new URLSearchParams()
    params.append("username", email) // OAuth2 uses username
    params.append("password", password)
    
    const { data } = await http.post<Token>("/api/auth/login", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
    return data
  },
  
  async register(payload: RegisterPayload) {
    const { data } = await http.post("/api/auth/register", payload)
    return data
  },
  
  async refresh(refreshToken: string): Promise<Token> {
    const { data } = await http.post<Token>("/api/auth/refresh", { refresh_token: refreshToken })
    return data
  },
  
  async logout(refreshToken: string) {
    // API logout uses Authorization header implicitly added by interceptor if available
    await http.post("/api/auth/logout", { refresh_token: refreshToken })
  }
}
