// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useReportExport } from "./useReportExport"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http } from "../../lib/http"
import React from "react"

vi.mock("../../lib/http", () => ({
  http: {
    post: vi.fn()
  }
}))

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn()
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  // pre-populate patient cache
  queryClient.setQueryData(["patient", "1"], {
    id: 1,
    clinical_data: { foo: 1, bar: 2 }, // just needs to pass getCompletion length
    age: 45,
    gender: "Male"
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe("useReportExport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("handles blank image guard", async () => {
    const { result } = renderHook(() => useReportExport(), { wrapper: createWrapper() })
    
    // mock canvas returning a tiny string
    const canvasEl = document.createElement("canvas")
    canvasEl.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,tiny")

    await result.current.exportReport({ patientId: "1", canvasEl })
    
    expect(result.current.status).toBe("error")
    expect(result.current.error).toBe("The 3D view isn't ready yet — wait for the heart to load and try again.")
    expect(http.post).not.toHaveBeenCalled()
  })

  it("handles error mapping (500)", async () => {
    const { result } = renderHook(() => useReportExport(), { wrapper: createWrapper() })
    
    const canvasEl = document.createElement("canvas")
    // large enough string
    canvasEl.toDataURL = vi.fn().mockReturnValue("data:image/png;base64," + "A".repeat(30000))

    vi.mocked(http.post).mockRejectedValueOnce({ response: { status: 500 } })

    await result.current.exportReport({ patientId: "1", canvasEl })
    
    expect(result.current.status).toBe("error")
    expect(result.current.error).toBe("The report could not be stored. Please try again.")
  })

  it("handles successful export", async () => {
    const { result } = renderHook(() => useReportExport(), { wrapper: createWrapper() })
    
    const canvasEl = document.createElement("canvas")
    canvasEl.toDataURL = vi.fn().mockReturnValue("data:image/png;base64," + "A".repeat(30000))

    vi.mocked(http.post).mockResolvedValueOnce({ 
      data: { id: 1, pdf_link: "https://example.com/pdf.pdf" } 
    })

    await result.current.exportReport({ patientId: "1", canvasEl })
    
    expect(result.current.status).toBe("ready")
    expect(result.current.pdfLink).toBe("https://example.com/pdf.pdf")
  })
})
