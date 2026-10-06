import { describe, it, expect, vi } from "vitest"
import { computeDashboardStats } from "./stats"
import type { Patient } from "../../types/api"

vi.mock("../analysis/normalizeAnalysis", () => ({
  normalizeAnalysis: (data: any) => {
    if (data.invalid) throw new Error("Invalid")
    return {
      predictions: {
        CAD: { visualization_band: data.cadBand, probability: data.cadProb },
        LAD: { visualization_band: data.ladBand, probability: data.ladProb },
        LCX: { visualization_band: data.lcxBand, probability: data.lcxProb },
        RCA: { visualization_band: data.rcaBand, probability: data.rcaProb }
      }
    }
  }
}))

const createPatient = (id: string, created_at: string, analysis_data?: any): Patient => ({
  id,
  created_at,
  updated_at: created_at,
  clinical_data: {},
  analysis_data,
}) as Patient

const createAnalysis = (cadBand: string, cadProb: number, ladBand: string, ladProb: number, lcxBand: string, lcxProb: number, rcaBand: string, rcaProb: number) => ({
  cadBand, cadProb, ladBand, ladProb, lcxBand, lcxProb, rcaBand, rcaProb
})

describe("computeDashboardStats", () => {
  it("handles empty list", () => {
    const stats = computeDashboardStats([])
    expect(stats.total).toBe(0)
    expect(stats.assessed).toBe(0)
    expect(stats.notAssessed).toBe(0)
    expect(stats.highRiskCount).toBe(0)
    expect(stats.recent).toHaveLength(0)
    expect(stats.watchlist).toHaveLength(0)
  })

  it("handles all unassessed", () => {
    const patients = [
      createPatient("1", "2023-01-01"),
      createPatient("2", "2023-01-02", { invalid: "data" })
    ]
    const stats = computeDashboardStats(patients)
    expect(stats.total).toBe(2)
    expect(stats.assessed).toBe(0)
    expect(stats.notAssessed).toBe(2)
    expect(stats.highRiskCount).toBe(0)
    expect(stats.recent).toHaveLength(2)
    expect(stats.watchlist).toHaveLength(0)
  })

  it("computes mixed bands correctly", () => {
    const patients = [
      // High risk CAD
      createPatient("1", "2023-01-01", createAnalysis("high", 0.9, "low", 0.1, "low", 0.1, "low", 0.1)),
      // Moderate CAD, but High LAD
      createPatient("2", "2023-01-02", createAnalysis("moderate", 0.6, "high", 0.8, "low", 0.1, "low", 0.1)),
      // Low risk everywhere
      createPatient("3", "2023-01-03", createAnalysis("low", 0.2, "low", 0.2, "low", 0.2, "low", 0.2)),
      // Unassessed
      createPatient("4", "2023-01-04")
    ]
    
    const stats = computeDashboardStats(patients)
    expect(stats.total).toBe(4)
    expect(stats.assessed).toBe(3)
    expect(stats.notAssessed).toBe(1)
    
    // Both pt 1 and pt 2 have at least one High band
    expect(stats.highRiskCount).toBe(2)
    expect(stats.bandCounts).toEqual({ Low: 1, Moderate: 0, High: 2 })
    
    // Pt 1: LAD/LCX/RCA all 0.1 -> LAD wins (first in array). Pt 2: LAD 0.8 -> LAD. Pt 3: LAD 0.2 -> LAD.
    // Wait, let's look at the ties. For Pt 1: LAD, LCX, RCA all 0.1. reduce returns LAD.
    expect(stats.byHighestVessel.LAD).toBe(3)
    
    // Watchlist should have pt 1 and 2, sorted by CAD probability (pt 1 > pt 2)
    expect(stats.watchlist).toHaveLength(2)
    expect(stats.watchlist[0].id).toBe("1")
    expect(stats.watchlist[1].id).toBe("2")
  })
})
