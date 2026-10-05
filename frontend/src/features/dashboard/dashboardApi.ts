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

export const dashboardApi = {
  async fetchAllPatients(): Promise<Patient[]> {
    let allPatients: Patient[] = []
    let skip = 0
    const limit = 100
    
    while (allPatients.length < 500) {
      const { data } = await http.get<Patient[]>("/api/patients/", {
        params: { skip, limit }
      })
      
      allPatients = allPatients.concat(data)
      
      if (data.length < limit) {
        break
      }
      skip += limit
    }
    
    // Cap at 500
    return allPatients.slice(0, 500)
  },

  async fetchModelInfo(): Promise<ModelInfo> {
    const { data } = await http.get<ModelInfo>("/api/v1/model-info")
    return data
  }
}
