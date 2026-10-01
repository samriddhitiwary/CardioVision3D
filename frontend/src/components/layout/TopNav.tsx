import { Activity, Server } from 'lucide-react'
import type { HealthResponse } from '../../types/api'

interface TopNavProps {
  health: HealthResponse | null
  checking: boolean
}

export function TopNav({ health, checking }: TopNavProps) {
  const ready = health?.models_loaded === true
  const label = checking ? 'Connecting' : ready ? 'Model Ready' : 'Unavailable'

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-700 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">CardioTwin</p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              AI-Powered Cardiovascular Risk Visualization
            </p>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
            ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <Server className="h-4 w-4" aria-hidden="true" />
          {label}
        </div>
      </div>
    </header>
  )
}

