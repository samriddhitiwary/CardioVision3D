import { http } from "../../lib/http"
import type { Patient } from "../../types/api"

export interface ModelInfo {
  model_version: string
  dataset_name: string
  targets: Record<string, {
    algorithm: string
    threshold: number
    calibration_method: string
    validation: {
      brier: number
    }
  }>
  limitations: string[]
}

import { patientsApi } from "../patients/patientsApi"

export const dashboardApi = {
  async fetchAllPatients(): Promise<Patient[]> {
    return patientsApi.listAll()
  },

  async fetchModelInfo(): Promise<ModelInfo> {
    const { data } = await http.get<ModelInfo>("/api/v1/model-info")
    return data
  }
}
