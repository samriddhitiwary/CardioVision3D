import { expect, test, describe, vi } from "vitest"

vi.mock("../../lib/http", () => ({
  http: { post: vi.fn() }
}))

import { isFallbackStory } from "../../services/riskStoryService"

describe("Analysis Feature", () => {
  test("Fallback detection function correctly identifies fallback stories", () => {
    // 1. Headline match
    expect(isFallbackStory({
      headline: "Model explanation available",
      summary: "",
      primary_message: "",
      positive_factors: [],
      negative_factors: [],
      vessels: [],
      highest_risk_vessel: null,
      visualization_steps: [],
      disclaimer: ""
    })).toBe(true)

    // 2. Disclaimer match
    expect(isFallbackStory({
      headline: "Some other headline",
      summary: "",
      primary_message: "",
      positive_factors: [],
      negative_factors: [],
      vessels: [],
      highest_risk_vessel: null,
      visualization_steps: [],
      disclaimer: "AI-generated narrative unavailable due to API limits"
    })).toBe(true)

    // 3. Valid AI story
    expect(isFallbackStory({
      headline: "High Risk Profile",
      summary: "",
      primary_message: "",
      positive_factors: [],
      negative_factors: [],
      vessels: [],
      highest_risk_vessel: null,
      visualization_steps: ["Step 1"],
      disclaimer: "This is an AI generated summary"
    })).toBe(false)
  })
})
