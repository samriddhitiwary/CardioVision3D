import { z } from "zod"
import type { AnalyzeResponse } from "../../types/api"

// We use zod to strictly validate the analysis response
// This is critical because the frontend blindly consumes these objects
// and we must ensure the backend contract is upheld.

const ExplanationContributorSchema = z.object({
  feature: z.string(),
  raw_value: z.any().nullable(),
  contribution: z.number(),
  direction: z.string(),
  ui_label: z.string()
})

const TargetExplanationSchema = z.object({
  probability: z.number(),
  threshold: z.number(),
  classification: z.string(),
  top_increasing_contributors: z.array(ExplanationContributorSchema),
  top_decreasing_contributors: z.array(ExplanationContributorSchema),
  explanation_method: z.string(),
  explanation_scope: z.string()
})

const TargetPredictionSchema = z.object({
  probability: z.number(),
  threshold: z.number(),
  positive: z.boolean(),
  risk_score: z.number(),
  visualization_band: z.enum(["low", "moderate", "high"]),
  band_basis: z.string()
})

export const AnalyzeResponseSchema = z.object({
  model_version: z.string(),
  disclaimer: z.string().optional().default("Educational / decision-support prototype only. Predictions are model risk estimates and are not a medical diagnosis or substitute for professional evaluation or coronary imaging."),
  predictions: z.object({
    CAD: TargetPredictionSchema,
    LAD: TargetPredictionSchema,
    LCX: TargetPredictionSchema,
    RCA: TargetPredictionSchema
  }),
  visualization: z.object({
    LAD: TargetPredictionSchema,
    LCX: TargetPredictionSchema,
    RCA: TargetPredictionSchema
  }),
  explanations: z.object({
    CAD: TargetExplanationSchema,
    LAD: TargetExplanationSchema,
    LCX: TargetExplanationSchema,
    RCA: TargetExplanationSchema
  })
})

export function normalizeAnalysis(data: unknown): AnalyzeResponse {
  // Will throw ZodError if the schema is violated
  return AnalyzeResponseSchema.parse(data) as AnalyzeResponse
}
