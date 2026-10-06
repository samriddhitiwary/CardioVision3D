import { describe, it, expect } from "vitest"
import { assessmentFields, assessmentSteps } from "../assessment/featureConfig"

describe("RecordsDetailPage Clinical Inputs Tab Coverage", () => {
  it("should cover all 55 input fields exactly once", () => {
    // 1. Gather all fields from assessmentFields
    const fields = [...assessmentFields]
    expect(fields.length).toBe(56)

    // 2. Validate that each field is assigned to a valid step
    const stepIds = assessmentSteps.map(s => s.id)
    fields.forEach(f => {
      expect(stepIds).toContain(f.step)
    })

    // 3. Ensure no duplicate keys in assessmentFields
    const fieldKeys = fields.map(f => f.key)
    const uniqueKeys = new Set(fieldKeys)
    expect(uniqueKeys.size).toBe(fields.length)

    // 4. Test grouping logic similar to ClinicalInputsTab.tsx
    const groupedFields = assessmentSteps.map(step => ({
      stepId: step.id,
      fields: fields.filter(f => f.step === step.id)
    }))

    // Check that summing the counts of grouped fields equals exactly 55
    const totalGrouped = groupedFields.reduce((acc, curr) => acc + curr.fields.length, 0)
    expect(totalGrouped).toBe(56)
  })
})
