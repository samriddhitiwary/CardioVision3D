export function sanitizeNextUrl(next: string | null): string {
  if (!next) return "/"
  // Reject full URLs or protocol-relative URLs
  if (next.includes("://") || next.startsWith("//")) {
    return "/"
  }
  // Must start with / to be a valid same-origin relative path
  if (!next.startsWith("/")) {
    return "/"
  }
  return next
}
