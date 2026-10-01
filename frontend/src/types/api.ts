export type TargetKey = 'CAD' | 'LAD' | 'LCX' | 'RCA'
export type VesselKey = 'LAD' | 'LCX' | 'RCA'
export type VisualizationBand = 'low' | 'moderate' | 'high'

export type PatientInput = Record<string, string | number>

export interface TargetPrediction {
  probability: number
  threshold: number
  positive: boolean
  risk_score: number
  visualization_band: VisualizationBand
  band_basis: string
}

export interface PredictionResponse {
  model_version: string
  predictions: Record<TargetKey, TargetPrediction>
  visualization: Record<VesselKey, TargetPrediction>
  disclaimer: string
}

export interface ExplanationContributor {
  feature: string
  raw_value: string | number | boolean | null
  contribution: number
  direction: string
  ui_label: string
}

export interface TargetExplanation {
  probability: number
  threshold: number
  classification: 'positive' | 'negative' | string
  top_increasing_contributors: ExplanationContributor[]
  top_decreasing_contributors: ExplanationContributor[]
  explanation_method: string
  explanation_scope: string
}

export interface ExplanationResponse {
  model_version: string
  explanations: Record<TargetKey, TargetExplanation>
  disclaimer: string
}

export interface AnalyzeResponse extends PredictionResponse {
  explanations: Record<TargetKey, TargetExplanation>
}

export interface HealthResponse {
  status: string
  model_version: string | null
  models_loaded: boolean
}

export interface ModelInfoTarget {
  algorithm: string
  threshold: number
  calibration_method: string
  validation: {
    method: string
    roc_auc: number
    pr_auc: number
    f1: number
    brier: number
  }
}

export interface ModelInfo {
  model_version: string
  dataset_name: string
  targets: Record<TargetKey, ModelInfoTarget>
  limitations: string[]
}

