import { describe, it, expect } from "vitest"
import { RegisterSchema } from "./registerValidation"

describe("RegisterSchema", () => {
  it("accepts valid registration data", () => {
    const valid = {
      fullName: "Dr. Smith",
      email: "smith@hospital.com",
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!"
    }
    expect(RegisterSchema.safeParse(valid).success).toBe(true)
  })

  it("rejects invalid emails", () => {
    const invalid = {
      fullName: "Dr. Smith",
      email: "not-an-email",
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!"
    }
    expect(RegisterSchema.safeParse(invalid).success).toBe(false)
  })

  it("rejects short passwords", () => {
    const invalid = {
      fullName: "Dr. Smith",
      email: "test@test.com",
      password: "Short1!", // 7 chars
      confirmPassword: "Short1!"
    }
    const result = RegisterSchema.safeParse(invalid)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("10 characters")
    }
  })

  it("rejects passwords without numbers or symbols", () => {
    const noNumber = {
      fullName: "Dr. Smith",
      email: "test@test.com",
      password: "StrongPassword!",
      confirmPassword: "StrongPassword!"
    }
    expect(RegisterSchema.safeParse(noNumber).success).toBe(false)

    const noSymbol = {
      fullName: "Dr. Smith",
      email: "test@test.com",
      password: "StrongPassword123",
      confirmPassword: "StrongPassword123"
    }
    expect(RegisterSchema.safeParse(noSymbol).success).toBe(false)
  })

  it("rejects mismatched passwords", () => {
    const mismatched = {
      fullName: "Dr. Smith",
      email: "test@test.com",
      password: "StrongPassword123!",
      confirmPassword: "DifferentPassword123!"
    }
    const result = RegisterSchema.safeParse(mismatched)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Passwords do not match")
    }
  })
})
