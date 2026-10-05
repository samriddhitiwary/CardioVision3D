import axios from "axios"

export function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "An unknown error occurred"
  }

  if (!error.response) {
    return "Can't reach the server"
  }

  if (error.response.status === 503) {
    return "Models are not initialised"
  }

  const data = error.response.data as any
  if (data?.detail) {
    if (typeof data.detail === "string") {
      return data.detail
    }
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d: any) => d.msg || "Validation error")
        .join(", ")
    }
  }

  return `Request failed with status ${error.response.status}`
}
