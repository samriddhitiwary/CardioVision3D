import { Activity } from 'lucide-react'
import type { TargetPrediction } from '../../../types/api'
import { bandStyles, formatPercent } from '../../../utils/riskBands'

interface CadRiskCardProps {
  prediction: TargetPrediction
}

export function CadRiskCard({ prediction }: CadRiskCardProps) {
  const band = bandStyles[prediction.visualization_band]
  const percent = Math.round(prediction.probability * 100)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Overall CAD Risk</p>
          <h2 className="mt-2 text-4xl font-semibold text-slate-950">{formatPercent(prediction.probability)}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {prediction.positive ? 'Above model decision threshold' : 'Below model decision threshold'} at{' '}
            {formatPercent(prediction.threshold)}.
          </p>
          <div className={`mt-4 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${band.bg} ${band.text} ${band.border}`}>
            Visualization band: {band.label}
          </div>
        </div>
        <div className="relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full bg-slate-50">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(#be123c ${percent * 3.6}deg, #e2e8f0 0deg)`,
            }}
          />
          <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-inner">
            <Activity className="h-6 w-6 text-rose-700" aria-hidden="true" />
            <span className="mt-2 text-2xl font-semibold text-slate-950">{formatPercent(prediction.probability)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

