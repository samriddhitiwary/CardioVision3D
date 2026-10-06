import type { Patient } from "../../types/api"
import { getAnalysis } from "../patients/patientView"

export interface DashboardStats {
  total: number
  assessed: number
  notAssessed: number
  highRiskCount: number
  bandCounts: {
    Low: number
    Moderate: number
    High: number
  }
  byHighestVessel: {
    LAD: number
    LCX: number
    RCA: number
  }
  recent: Patient[]
  watchlist: Patient[]
}

type Band = "low" | "moderate" | "high"

const bandValue = (band: Band | string): number => {
  if (band.toLowerCase() === "high") return 3
  if (band.toLowerCase() === "moderate") return 2
  return 1
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function computeDashboardStats(patients: Patient[]): DashboardStats {
  const stats: DashboardStats = {
    total: patients.length,
    assessed: 0,
    notAssessed: 0,
    highRiskCount: 0,
    bandCounts: { Low: 0, Moderate: 0, High: 0 },
    byHighestVessel: { LAD: 0, LCX: 0, RCA: 0 },
    recent: [],
    watchlist: [],
  }

  const validPatients: { patient: Patient, analysis: any }[] = []

  // Process all patients
  for (const patient of patients) {
    if (!patient.analysis_data) {
      stats.notAssessed++
      continue
    }

    try {
      const analysis = getAnalysis(patient)
      if (!analysis) {
        stats.notAssessed++
        continue
      }
      stats.assessed++
      validPatients.push({ patient, analysis })

      // Calculate highest overall band
      const bands = [
        analysis.predictions.CAD.visualization_band,
        analysis.predictions.LAD.visualization_band,
        analysis.predictions.LCX.visualization_band,
        analysis.predictions.RCA.visualization_band
      ] as Band[]

      const highestBand = bands.reduce((acc, b) => bandValue(b) > bandValue(acc) ? b : acc, "low" as Band)
      const formattedBand = capitalize(highestBand) as "Low" | "Moderate" | "High"
      stats.bandCounts[formattedBand]++

      if (formattedBand === "High") {
        stats.highRiskCount++
      }

      // Calculate highest vessel
      const vessels = [
        { name: "LAD", prob: analysis.predictions.LAD.probability },
        { name: "LCX", prob: analysis.predictions.LCX.probability },
        { name: "RCA", prob: analysis.predictions.RCA.probability },
      ]
      
      const highestVessel = vessels.reduce((acc, v) => v.prob > acc.prob ? v : acc, vessels[0])
      stats.byHighestVessel[highestVessel.name as "LAD" | "LCX" | "RCA"]++

    } catch (e) {
      stats.notAssessed++
    }
  }

  // Calculate recent (top 5 by created_at)
  stats.recent = [...patients].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }).slice(0, 5)

  // Calculate watchlist (any high band, sorted by cad prob desc, top 6)
  stats.watchlist = validPatients
    .filter(({ analysis }) => {
      return analysis.predictions.CAD.visualization_band === "high" ||
             analysis.predictions.LAD.visualization_band === "high" ||
             analysis.predictions.LCX.visualization_band === "high" ||
             analysis.predictions.RCA.visualization_band === "high"
    })
    .sort((a, b) => b.analysis.predictions.CAD.probability - a.analysis.predictions.CAD.probability)
    .slice(0, 6)
    .map(vp => vp.patient)

  return stats
}
