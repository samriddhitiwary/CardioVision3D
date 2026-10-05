import { Info } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TargetExplanation, TargetKey } from '../../../types/api'

interface ExplainabilityPanelProps {
  explanations: Record<TargetKey, TargetExplanation>
  selectedTarget: TargetKey
  onSelectTarget: (target: TargetKey) => void
}

const targets: TargetKey[] = ['CAD', 'LAD', 'LCX', 'RCA']

function ContributionList({ title, items }: { title: string; items: TargetExplanation['top_increasing_contributors'] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={`${item.feature}-${item.contribution}`} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{item.feature}</p>
                <p className="mt-1 text-xs text-slate-500">Patient value: {String(item.raw_value ?? 'Not available')}</p>
              </div>
              <span className="text-sm font-semibold text-slate-700">{item.contribution.toFixed(3)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{item.ui_label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExplainabilityPanel({ explanations, selectedTarget, onSelectTarget }: ExplainabilityPanelProps) {
  const explanation = explanations[selectedTarget]
  const chartData = [
    ...explanation.top_increasing_contributors.map((item) => ({ feature: item.feature, contribution: item.contribution })),
    ...explanation.top_decreasing_contributors.map((item) => ({ feature: item.feature, contribution: item.contribution })),
  ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Explainability</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Why did the model produce this prediction?</h3>
          <p className="mt-2 flex max-w-3xl items-start gap-2 text-sm text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            These factors describe how the model used the patient's inputs. They do not establish medical causality.
          </p>
        </div>
        <div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">
          {targets.map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => onSelectTarget(target)}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-rose-200 ${
                selectedTarget === target ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {target}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-80 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="feature" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [Number(value).toFixed(3), 'Model contribution']} />
              <Bar dataKey="contribution" fill="#be123c" radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1">
          <ContributionList title="Top factors increasing predicted risk" items={explanation.top_increasing_contributors} />
          <ContributionList title="Top factors decreasing predicted risk" items={explanation.top_decreasing_contributors} />
        </div>
      </div>
    </section>
  )
}

