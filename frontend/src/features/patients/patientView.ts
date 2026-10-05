import type { Patient, AnalyzeResponse } from "../../types/api"
import { normalizeAnalysis } from "../analysis/normalizeAnalysis"

export function getAnalysis(patient: Patient): AnalyzeResponse | null {
  if (!patient.analysis_data) return null
  try {
    return normalizeAnalysis(patient.analysis_data)
  } catch (e) {
    return null
  }
}

export function getHighestBand(analysis: AnalyzeResponse | null): string {
  if (!analysis) return "Not assessed"
  
  const bands = [
    analysis.predictions.CAD.visualization_band,
    analysis.predictions.LAD.visualization_band,
    analysis.predictions.LCX.visualization_band,
    analysis.predictions.RCA.visualization_band
  ]
  
  if (bands.includes("high")) return "High"
  if (bands.includes("moderate")) return "Moderate"
  return "Low"
}

export function getCompletion(patient: Patient): { filled: number, total: number } {
  // Mock count based on phase instructions. 
  // Should count valid feature keys. There are 55 features in the ML schema.
  // clinical_data has other keys like age, gender.
  const data = patient.clinical_data || {}
  const skipKeys = ["age", "sex", "gender", "name"]
  let filled = 0
  
  // As a heuristic for the UI: count keys in clinical_data that aren't the basic ones
  for (const key of Object.keys(data)) {
    if (!skipKeys.includes(key.toLowerCase()) && data[key] !== null && data[key] !== undefined && data[key] !== "") {
      filled++
    }
  }
  
  // Total is 55
  return { filled, total: 55 }
}

export function syncPatientTopLevelAndClinical(payload: Partial<Patient>): Partial<Patient> {
  const result = { ...payload }
  
  if (!result.clinical_data) {
    result.clinical_data = {}
  } else {
    // deep copy clinical_data to avoid mutating original payload object
    result.clinical_data = { ...result.clinical_data }
  }

  // Top level to clinical_data
  if (result.age !== undefined) {
    result.clinical_data.age = result.age
  }
  if (result.gender !== undefined) {
    // Convert generic gender to dataset value
    const isMale = result.gender.toLowerCase().startsWith("m")
    result.clinical_data.sex = isMale ? 1 : 0
  }

  // Clinical data to top level
  if (result.clinical_data.age !== undefined) {
    result.age = Number(result.clinical_data.age)
  }
  if (result.clinical_data.sex !== undefined) {
    result.gender = result.clinical_data.sex === 1 ? "Male" : "Fmale"
  }

  return result
}
