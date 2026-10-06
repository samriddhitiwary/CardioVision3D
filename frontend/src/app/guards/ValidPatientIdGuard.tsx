import { useParams } from "react-router-dom"
import { NotFoundPage } from "../pages/NotFoundPage"
import type { ReactNode } from "react"

export function ValidPatientIdGuard({ children, paramName = "patientId" }: { children: ReactNode, paramName?: string }) {
  const params = useParams()
  const idStr = params[paramName]
  
  if (idStr) {
    const numId = Number(idStr)
    if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
      return <NotFoundPage />
    }
  }
  
  return <>{children}</>
}
