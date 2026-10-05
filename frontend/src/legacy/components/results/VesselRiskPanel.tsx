import type { TargetPrediction, VesselKey } from '../../../types/api'
import { bandStyles, formatPercent } from '../../../utils/riskBands'

interface VesselRiskPanelProps {
  visualization: Record<VesselKey, TargetPrediction>
  selectedVessel: VesselKey
  onSelectVessel: (vessel: VesselKey) => void
}

const vesselNames: Record<VesselKey, string> = {
  LAD: 'Left Anterior Descending',
  LCX: 'Left Circumflex',
  RCA: 'Right Coronary Artery',
}

export function VesselRiskPanel({ visualization, selectedVessel, onSelectVessel }: VesselRiskPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Vessel Risk Panel</p>
      <h3 className="mt-1 text-xl font-semibold text-slate-950">Coronary vessel estimates</h3>
      <div className="mt-5 grid gap-3">
        {(Object.keys(vesselNames) as VesselKey[]).map((vessel) => {
          const prediction = visualization[vessel]
          const band = bandStyles[prediction.visualization_band]
          return (
            <button
              key={vessel}
              type="button"
              onClick={() => onSelectVessel(vessel)}
              className={`rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-rose-200 ${
                selectedVessel === vessel ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{vessel}</p>
                  <p className="text-sm text-slate-500">{vesselNames[vessel]}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${band.bg} ${band.text}`}>
                  {band.label}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="text-3xl font-semibold text-slate-950">{formatPercent(prediction.probability)}</p>
                <p className="text-right text-xs font-medium text-slate-500">
                  Threshold {formatPercent(prediction.threshold)}
                  <br />
                  {prediction.positive ? 'Above model threshold' : 'Below model threshold'}
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className={`h-2 rounded-full ${band.bar}`} style={{ width: `${prediction.probability * 100}%` }} />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

