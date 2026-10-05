import { QueryClient } from "@tanstack/react-query"
import axios from "axios"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30s
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response) {
          // Never retry 4xx client errors
          if (error.response.status >= 400 && error.response.status < 500) {
            return false
          }
        }
        // Retry once for network/5xx
        return failureCount < 1
      },
    },
  },
})
