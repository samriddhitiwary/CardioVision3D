import { describe, it, expect, vi, beforeEach } from "vitest"
// No axios import
import { http } from "../../lib/http"
import { authStore } from "./authStore"
import { authApi } from "./authApi"

// Mock dependencies
vi.mock("./authApi", () => ({
  authApi: {
    refresh: vi.fn(),
  }
}))

vi.mock("./authStore", () => ({
  authStore: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getState: vi.fn(() => ({ profile: null })),
    setSession: vi.fn(),
    clearSession: vi.fn(),
  }
}))

describe("Single-Flight Token Refresh Interceptor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // By default, assume we have a refresh token
    vi.mocked(authStore.getRefreshToken).mockReturnValue("fake-refresh-token")
  })

  it("deduplicates multiple concurrent 401 requests into a single refresh call", async () => {
    // Mock the refresh API to resolve after a short delay
    const refreshPromise = new Promise<{ access_token: string, refresh_token: string, token_type: string }>((resolve) => {
      setTimeout(() => {
        resolve({ access_token: "new-access", refresh_token: "new-refresh", token_type: "bearer" })
      }, 50)
    })
    
    vi.mocked(authApi.refresh).mockReturnValue(refreshPromise)

    // Create a mock adapter to simulate 401 responses
    const mockAdapter = vi.fn()
      // First two requests fail with 401
      .mockRejectedValueOnce({
        response: { status: 401 },
        config: { url: "/api/protected1" }
      })
      .mockRejectedValueOnce({
        response: { status: 401 },
        config: { url: "/api/protected2" }
      })
      // The retries (after refresh) succeed
      .mockResolvedValueOnce({ data: "success1" })
      .mockResolvedValueOnce({ data: "success2" })

    // Temporarily replace the axios adapter
    const originalAdapter = http.defaults.adapter
    http.defaults.adapter = mockAdapter

    // Fire two requests concurrently
    const req1 = http.get("/api/protected1")
    const req2 = http.get("/api/protected2")

    await Promise.all([req1, req2])

    // authApi.refresh should only have been called once despite two 401s
    expect(authApi.refresh).toHaveBeenCalledTimes(1)
    
    // session should be updated
    expect(authStore.setSession).toHaveBeenCalledWith("new-access", "new-refresh", undefined)

    // Restore adapter
    http.defaults.adapter = originalAdapter
  })
})
