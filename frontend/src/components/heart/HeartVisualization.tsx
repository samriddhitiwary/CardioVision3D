import type { VesselKey } from '../../types/api'
import { formatPercent } from '../../utils/riskBands'

interface HeartVisualizationProps {
  ladRisk?: number
  lcxRisk?: number
  rcaRisk?: number
  selectedVessel: VesselKey
  onSelectVessel: (vessel: VesselKey) => void
}

const vesselLabels: Record<VesselKey, string> = {
  LAD: 'Left Anterior Descending',
  LCX: 'Left Circumflex',
  RCA: 'Right Coronary Artery',
}

export function HeartVisualization({ ladRisk, lcxRisk, rcaRisk, selectedVessel, onSelectVessel }: HeartVisualizationProps) {
  const riskByVessel: Record<VesselKey, number | undefined> = { LAD: ladRisk, LCX: lcxRisk, RCA: rcaRisk }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">3D Vessel View</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Interactive 3D Heart</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          Next phase
        </span>
      </div>

      <div className="mt-5 flex aspect-[4/3] min-h-[300px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <div className="max-w-sm px-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-rose-200 bg-white text-2xl font-bold text-rose-700">
            CT
          </div>
          <p className="mt-5 text-lg font-semibold text-slate-950">Interactive 3D Heart</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Three.js coronary visualization will be inserted here. Current panel already receives vessel risk and selected-vessel state.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(Object.keys(vesselLabels) as VesselKey[]).map((vessel) => (
          <button
            key={vessel}
            type="button"
            onClick={() => onSelectVessel(vessel)}
            className={`rounded-md border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-rose-200 ${
              selectedVessel === vessel ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <p className="text-sm font-semibold text-slate-950">{vessel}</p>
            <p className="mt-1 text-xs text-slate-500">{vesselLabels[vessel]}</p>
            <p className="mt-2 text-sm font-semibold text-rose-700">
              {riskByVessel[vessel] === undefined ? 'Awaiting analysis' : formatPercent(riskByVessel[vessel])}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}

