import { AlertTriangle, CheckCircle } from "lucide-react"
import { RiskBadge } from "../../dashboard/components/RiskBadge"
import type { AnalyzeResponse, VesselKey } from "../../../types/api"

interface VesselCardsProps {
  visualization: AnalyzeResponse["visualization"]
  selectedVessel: VesselKey
  onSelectVessel: (vessel: VesselKey) => void
}

const VESSEL_INFO = {
  LAD: {
    fullName: "Left Anterior Descending",
    territory: "Anterior wall and septum"
  },
  LCX: {
    fullName: "Left Circumflex",
    territory: "Lateral and posterior left ventricle"
  },
  RCA: {
    fullName: "Right Coronary Artery",
    territory: "Right atrium/ventricle, inferior wall, SA/AV nodes"
  }
}

export function VesselCards({ visualization, selectedVessel, onSelectVessel }: VesselCardsProps) {
  const vessels: VesselKey[] = ["LAD", "LCX", "RCA"]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {vessels.map(vessel => {
        const data = visualization[vessel]
        const info = VESSEL_INFO[vessel]
        const isSelected = selectedVessel === vessel
        
        return (
          <button
            key={vessel}
            onClick={() => onSelectVessel(vessel)}
            className={`text-left rounded-xl border p-4 transition-all relative overflow-hidden ${
              isSelected 
                ? 'border-[var(--primary)] shadow-md bg-[var(--primary-soft)]/30 ring-1 ring-[var(--primary)]' 
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text-muted)] hover:shadow-sm'
            }`}
          >
            
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg text-[var(--text)]">{vessel}</h3>
                <p className="text-xs font-medium text-[var(--text-muted)]">{info.fullName}</p>
              </div>
              <RiskBadge band={data.visualization_band} />
            </div>
            
            <p className="text-[11px] text-[var(--text-muted)] leading-tight mb-4 min-h-[30px]">
              {info.territory}
            </p>
            
            <div className="flex items-end justify-between mt-auto pt-3 border-t border-[var(--border)]">
              <div>
                <div className="text-2xl font-bold text-[var(--text)] leading-none">
                  {(data.probability * 100).toFixed(1)}<span className="text-sm text-[var(--text-muted)] ml-0.5">%</span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Threshold: {(data.threshold * 100).toFixed(1)}%
                </div>
              </div>
              <div className="flex flex-col items-end">
                {data.positive ? (
                  <span className="inline-flex items-center text-xs font-semibold text-[var(--danger)]">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Positive
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-[var(--success)]">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Negative
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
