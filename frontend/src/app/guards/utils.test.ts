import { describe, it, expect } from "vitest"
import { sanitizeNextUrl } from "./utils"

describe("sanitizeNextUrl", () => {
  it("allows valid relative paths", () => {
    expect(sanitizeNextUrl("/dashboard")).toBe("/dashboard")
    expect(sanitizeNextUrl("/assessment/new?param=1")).toBe("/assessment/new?param=1")
    expect(sanitizeNextUrl("/")).toBe("/")
  })

  it("rejects absolute URLs", () => {
    expect(sanitizeNextUrl("https://evil.com/login")).toBe("/")
    expect(sanitizeNextUrl("http://evil.com")).toBe("/")
  })

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeNextUrl("//evil.com")).toBe("/")
    expect(sanitizeNextUrl("///evil.com")).toBe("/")
  })

  it("rejects javascript URIs", () => {
    expect(sanitizeNextUrl("javascript:alert(1)")).toBe("/")
  })

  it("rejects paths not starting with /", () => {
    expect(sanitizeNextUrl("dashboard")).toBe("/")
    expect(sanitizeNextUrl("evil.com/dashboard")).toBe("/")
  })

  it("handles null or empty", () => {
    expect(sanitizeNextUrl(null)).toBe("/")
    expect(sanitizeNextUrl("")).toBe("/")
  })
})
