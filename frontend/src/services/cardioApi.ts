import axios from 'axios'
import type { AnalyzeResponse, HealthResponse, ModelInfo, PatientInput, PredictionResponse } from '../types/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
})

export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/health')
  return response.data
}

export async function getModelInfo(): Promise<ModelInfo> {
  const response = await api.get<ModelInfo>('/api/v1/model-info')
  return response.data
}

export async function predictPatient(patient: PatientInput): Promise<PredictionResponse> {
  const response = await api.post<PredictionResponse>('/api/v1/predict', patient)
  return response.data
}

export async function analyzePatient(patient: PatientInput): Promise<AnalyzeResponse> {
  const response = await api.post<AnalyzeResponse>('/api/v1/analyze', patient)
  return response.data
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Backend unavailable. Start the FastAPI server and check VITE_API_BASE_URL.'
    }
    if (error.response.status === 422) {
      return 'Some clinical inputs are missing or invalid. Review highlighted fields and try again.'
    }
    if (error.response.status === 503) {
      return 'Models are not initialized yet. Restart the backend and try again.'
    }
    return `Request failed with status ${error.response.status}. Please try again.`
  }
  return 'Unexpected analysis error. Please try again.'
}

