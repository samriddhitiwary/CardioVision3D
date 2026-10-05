import React, { createContext, useContext, useEffect, useState } from "react"
import { useMatch, useLocation } from "react-router-dom"
import { usePatient } from "./hooks"
import type { Patient } from "../../types/api"

interface ActivePatientContextValue {
  activePatientId: string | null
  setActivePatientId: (id: string | null) => void
  activePatient: Patient | null | undefined
  isLoading: boolean
}

const ActivePatientContext = createContext<ActivePatientContextValue | null>(null)

const STORAGE_KEY = "cv3d.activePatient"

export function ActivePatientProvider({ children }: { children: React.ReactNode }) {
  const [activePatientId, setLocalActivePatientId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })

  // Check URL params
  const recordsMatch = useMatch("/records/:patientId")
  const analysisMatch = useMatch("/analysis/:patientId")
  const assessmentMatch = useMatch("/assessment/:patientId")

  const paramId = recordsMatch?.params.patientId 
    || analysisMatch?.params.patientId 
    || assessmentMatch?.params.patientId

  useEffect(() => {
    if (paramId && paramId !== "new") {
      setLocalActivePatientId(paramId)
      localStorage.setItem(STORAGE_KEY, paramId)
    }
  }, [paramId])

  const setActivePatientId = (id: string | null) => {
    setLocalActivePatientId(id)
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const { data: activePatient, isLoading, isError } = usePatient(activePatientId || undefined)

  useEffect(() => {
    if (isError && activePatientId) {
      // 404 or failed -> clear silently
      setActivePatientId(null)
    }
  }, [isError, activePatientId])

  return (
    <ActivePatientContext.Provider value={{
      activePatientId,
      setActivePatientId,
      activePatient,
      isLoading
    }}>
      {children}
    </ActivePatientContext.Provider>
  )
}

export function useActivePatient() {
  const ctx = useContext(ActivePatientContext)
  if (!ctx) throw new Error("useActivePatient must be used within ActivePatientProvider")
  return ctx
}
