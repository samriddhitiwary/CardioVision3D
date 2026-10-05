import { describe, it, expect } from "vitest"
import { normalizeAnalysis } from "./normalizeAnalysis"

describe("normalizeAnalysis", () => {
  it("validates and returns a correct AnalyzeResponse", () => {
    const validPayload = {
      model_version: "v1.0.0",
      disclaimer: "Test disclaimer",
      predictions: {
        CAD: { probability: 0.8, threshold: 0.5, positive: true, risk_score: 80, visualization_band: "high", band_basis: "test" },
        LAD: { probability: 0.1, threshold: 0.5, positive: false, risk_score: 10, visualization_band: "low", band_basis: "test" },
        LCX: { probability: 0.2, threshold: 0.5, positive: false, risk_score: 20, visualization_band: "low", band_basis: "test" },
        RCA: { probability: 0.3, threshold: 0.5, positive: false, risk_score: 30, visualization_band: "low", band_basis: "test" }
      },
      visualization: {
        LAD: { probability: 0.1, threshold: 0.5, positive: false, risk_score: 10, visualization_band: "low", band_basis: "test" },
        LCX: { probability: 0.2, threshold: 0.5, positive: false, risk_score: 20, visualization_band: "low", band_basis: "test" },
        RCA: { probability: 0.3, threshold: 0.5, positive: false, risk_score: 30, visualization_band: "low", band_basis: "test" }
      },
      explanations: {
        CAD: { probability: 0.8, threshold: 0.5, classification: "positive", top_increasing_contributors: [], top_decreasing_contributors: [], explanation_method: "SHAP", explanation_scope: "local" },
        LAD: { probability: 0.1, threshold: 0.5, classification: "negative", top_increasing_contributors: [], top_decreasing_contributors: [], explanation_method: "SHAP", explanation_scope: "local" },
        LCX: { probability: 0.2, threshold: 0.5, classification: "negative", top_increasing_contributors: [], top_decreasing_contributors: [], explanation_method: "SHAP", explanation_scope: "local" },
        RCA: { probability: 0.3, threshold: 0.5, classification: "negative", top_increasing_contributors: [], top_decreasing_contributors: [], explanation_method: "SHAP", explanation_scope: "local" }
      }
    }

    const result = normalizeAnalysis(validPayload)
    expect(result.model_version).toBe("v1.0.0")
    // Ensures LAD/LCX/RCA are read from visualization and CAD from predictions structurally
    expect(result.visualization.LAD).toBeDefined()
    expect(result.predictions.CAD).toBeDefined()
  })

  it("throws on invalid data", () => {
    expect(() => normalizeAnalysis({})).toThrow()
    expect(() => normalizeAnalysis({ model_version: "v1.0.0" })).toThrow()
  })
})
