import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { Card, CardBody, CardHeader, CardTitle } from "../../../components/ui/Card"
import type { Patient } from "../../../types/api"
import { getAnalysis } from "../../patients/patientView"
import { RiskBadge } from "./RiskBadge"
import { formatPercent } from "../../../lib/format"

interface WatchlistProps {
  patients: Patient[]
}

export function Watchlist({ patients }: WatchlistProps) {
  const navigate = useNavigate()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">High-Risk Watchlist</CardTitle>
      </CardHeader>
      <CardBody className="flex-1 p-0">
        {patients.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
            No high-risk patients
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {patients.map(patient => {
              const analysis = getAnalysis(patient)
              if (!analysis) return null // should not happen since stats.ts filters these

              const cadProb = analysis.predictions.CAD.probability
              const band = analysis.predictions.CAD.visualization_band
              const age = patient.clinical_data.age || "?"
              const sex = patient.clinical_data.sex === 1 ? "M" : "F"
              const name = `Patient #${patient.id}` // Fallback since backend has no name field

              return (
                <li 
                  key={patient.id} 
                  className="flex items-center justify-between p-4 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                  onClick={() => navigate(`/analysis/${patient.id}`)}
                >
                  <div>
                    <p className="font-medium text-[var(--text)]">{name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {age} y/o • {sex} • CAD {formatPercent(cadProb)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RiskBadge band={band} />
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
