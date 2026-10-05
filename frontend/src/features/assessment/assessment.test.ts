import { expect, test } from "vitest"
import { fullAssessmentSchema, PRESET_DEMO } from "./featureConfig"

test("fullAssessmentSchema validates exactly 55 fields correctly", () => {
  // Parse the demo patient, it should pass
  const result = fullAssessmentSchema.safeParse(PRESET_DEMO)
  expect(result.success).toBe(true)

  if (result.success) {
    const keys = Object.keys(result.data)
    expect(keys.length).toBe(56) // 55 clinical + name
  }

  // Ensure invalid fails
  const badData = { ...PRESET_DEMO, age: 10 } // 10 is outside 18-100 range
  const badResult = fullAssessmentSchema.safeParse(badData)
  expect(badResult.success).toBe(false)
})
