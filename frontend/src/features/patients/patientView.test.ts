import { describe, it, expect } from "vitest"
import { getCompletion, getHighestBand, syncPatientTopLevelAndClinical } from "./patientView"

describe("patientView helpers", () => {
  it("getHighestBand returns correct band", () => {
    expect(getHighestBand(null)).toBe("Not assessed")
    
    const mockAnalysis = {
      predictions: {
        CAD: { visualization_band: "low" },
        LAD: { visualization_band: "low" },
        LCX: { visualization_band: "moderate" },
        RCA: { visualization_band: "low" },
      }
    } as any
    expect(getHighestBand(mockAnalysis)).toBe("Moderate")
    
    mockAnalysis.predictions.LAD.visualization_band = "high"
    expect(getHighestBand(mockAnalysis)).toBe("High")
  })

  it("getCompletion counts properly", () => {
    const patient = {
      clinical_data: {
        age: 50,
        sex: 1,
        thalach: 150,
        trestbps: 120,
        empty: "",
        nullField: null
      }
    } as any
    
    const res = getCompletion(patient)
    // Should skip age, sex, empty, nullField. Should count thalach and trestbps.
    expect(res.filled).toBe(2)
    expect(res.total).toBe(55)
  })

  it("syncPatientTopLevelAndClinical syncs fields properly", () => {
    const payload1 = {
      age: 45,
      gender: "Male",
      clinical_data: { other: 123 }
    }
    const synced1 = syncPatientTopLevelAndClinical(payload1)
    expect(synced1.clinical_data?.age).toBe(45)
    expect(synced1.clinical_data?.sex).toBe(1)
    
    const payload2 = {
      clinical_data: { age: 60, sex: 0 }
    }
    const synced2 = syncPatientTopLevelAndClinical(payload2)
    expect(synced2.age).toBe(60)
    expect(synced2.gender).toBe("Fmale")
  })
})
