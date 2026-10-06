import { http } from "../lib/http"

export interface RiskStoryRequest {
  force_regenerate?: boolean
  language?: string
}

export interface RiskStoryFactor {
  feature: string
  display_name: string
  direction: "increases_risk" | "decreases_risk"
  contribution: number
  value_text: string
  explanation: string
}

export interface RiskStoryVessel {
  vessel: "LAD" | "LCX" | "RCA"
  risk_percent: number
  severity: "low" | "moderate" | "high"
}

export interface RiskStoryResponse {
  headline: string
  summary: string
  primary_message: string
  positive_factors: RiskStoryFactor[]
  negative_factors: RiskStoryFactor[]
  vessels: RiskStoryVessel[]
  highest_risk_vessel: "LAD" | "LCX" | "RCA" | null
  visualization_steps: string[]
  disclaimer: string
}

export async function generateRiskStory(patientId: string | number, request: RiskStoryRequest = {}): Promise<RiskStoryResponse> {
  const { force_regenerate = false, language = "en" } = request
  const response = await http.post<RiskStoryResponse>(`/api/v1/patients/${patientId}/risk-story`, {
    force_regenerate,
    language
  })
  return response.data
}

// Fallback detection
export function isFallbackStory(story: RiskStoryResponse): boolean {
  return story.headline === "Model explanation available" || 
         (story.visualization_steps.length === 0 && story.disclaimer.startsWith("AI-generated narrative unavailable"))
}
