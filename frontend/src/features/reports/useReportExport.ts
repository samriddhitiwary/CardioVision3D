import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { http } from "../../lib/http"
import { usePatient, useUpdatePatient } from "../patients/hooks"
import { getCompletion } from "../patients/patientView"
import type { Patient } from "../../types/api"

export type ExportStatus = "idle" | "capturing" | "generating" | "ready" | "error"

interface ExportReportArgs {
  patientId: string | number
  canvasEl: HTMLCanvasElement | null
}

export function useReportExport() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [status, setStatus] = useState<ExportStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [pdfLink, setPdfLink] = useState<string | null>(null)

  const exportReport = useCallback(async ({ patientId, canvasEl }: ExportReportArgs) => {
    if (status === "capturing" || status === "generating") return

    // 1. Preconditions
    const patient = queryClient.getQueryData<Patient>(["patient", String(patientId)])
    if (!patient) {
      setError("Patient data not found.")
      setStatus("error")
      return
    }

    const { filled, total } = getCompletion(patient)
    if (filled < total) {
      setError("Clinical data is incomplete. Please resume the assessment.")
      setStatus("error")
      return
    }

    if (!canvasEl) {
      setError("The 3D view isn't ready yet — wait for the heart to load and try again.")
      setStatus("error")
      return
    }

    setStatus("capturing")
    setError(null)

    // 2. Capture canvas
    try {
      const dataUrl = canvasEl.toDataURL("image/png")
      
      // Validate non-trivial image
      // A blank WebGL canvas of typical size usually compresses very well (e.g. solid black or transparent)
      // and typically results in a data URL less than 10-20KB.
      if (dataUrl.length < 20000) {
        setError("The 3D view isn't ready yet — wait for the heart to load and try again.")
        setStatus("error")
        return
      }

      setStatus("generating")

      // 3. POST API
      const response = await http.post<Patient>(`/api/patients/${patientId}/report`, {
        image_base64: dataUrl
      })

      // 4. On success update cached patient
      const updatedPatient = response.data
      queryClient.setQueryData(["patient", String(patientId)], updatedPatient)
      queryClient.invalidateQueries({ queryKey: ["patients", "all"] })
      
      if (updatedPatient.pdf_link) {
        setPdfLink(updatedPatient.pdf_link)
      }
      
      setStatus("ready")
      
      // Toast would go here if we had a toast system in scope, 
      // but UI will show the "Open PDF" state.
    } catch (e: any) {
      console.error(e)
      setStatus("error")
      
      if (e.response?.status === 400) {
        setError("Patient has no clinical data or data is incomplete.")
      } else if (e.response?.status === 500) {
        setError("The report could not be stored. Please try again.")
      } else {
        setError("The report could not be generated due to a network error. Please try again.")
      }
    }
  }, [queryClient, status])

  return {
    exportReport,
    status,
    error,
    pdfLink,
    reset: () => {
      setStatus("idle")
      setError(null)
      setPdfLink(null)
    }
  }
}
