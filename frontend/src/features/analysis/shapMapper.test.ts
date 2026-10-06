import { expect, test, describe } from "vitest"
import { mapShapData } from "./shapMapper"
import type { AnalyzeResponse } from "../../types/api"

describe("shapMapper", () => {
  test("correctly maps and sorts SHAP data, extracting units and config labels", () => {
    const mockExplanation: AnalyzeResponse["explanations"]["CAD"] = {
      probability: 0.8,
      threshold: 0.5,
      classification: "High Risk",
      explanation_method: "TreeSHAP",
      explanation_scope: "Global",
      top_increasing_contributors: [
        {
          feature: "bmi", // known config field
          ui_label: "BMI",
          raw_value: 32.5,
          contribution: 0.2, // absolute 0.2
          direction: "increases_risk"
        }
      ],
      top_decreasing_contributors: [
        {
          feature: "unknown_field", // not in config
          ui_label: "Unknown Field",
          raw_value: 10,
          contribution: 0.15, // absolute 0.15
          direction: "decreases_risk"
        },
        {
          feature: "cholesterol", // hypothetical field
          ui_label: "Cholesterol",
          raw_value: null,
          contribution: 0.3, // absolute 0.3 (should be sorted first)
          direction: "decreases_risk"
        }
      ]
    }

    const result = mapShapData(mockExplanation)

    expect(result).toHaveLength(3)
    
    // Test sorting by absolute contribution descending
    // 0.3 -> 0.2 -> 0.15
    expect(result[0].feature).toBe("cholesterol")
    expect(result[1].feature).toBe("bmi")
    expect(result[2].feature).toBe("unknown_field")

    // Test sign inversion for decreasing contributors
    expect(result[0].signed_contribution).toBe(-0.3)
    expect(result[0].value).toBe(-0.3)
    
    expect(result[1].signed_contribution).toBe(0.2)
    expect(result[1].value).toBe(0.2)

    // Test label formatting with units from feature config (BMI has unit kg/m²)
    expect(result[1].name).toBe("BMI: 32.5 kg/m²")
    
    // Test null value handling
    expect(result[0].name).toBe("Cholesterol: N/A")
  })

  test("handles undefined explanation gracefully", () => {
    expect(mapShapData(undefined)).toEqual([])
  })
})
