import type { ModelInfo, TargetKey } from '../../types/api'

interface ModelInfoCardProps {
  modelInfo: ModelInfo | null
}

const targets: TargetKey[] = ['CAD', 'LAD', 'LCX', 'RCA']

export function ModelInfoCard({ modelInfo }: ModelInfoCardProps) {
  if (!modelInfo) {
    return null
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Model Information</p>
      <h3 className="mt-1 text-xl font-semibold text-slate-950">Frozen ML system v{modelInfo.model_version}</h3>
      <p className="mt-2 text-sm text-slate-600">{modelInfo.dataset_name}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {targets.map((target) => {
          const info = modelInfo.targets[target]
          return (
            <div key={target} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">{target}</p>
              <p className="mt-1 text-xs text-slate-500">{info.algorithm}</p>
              <dl className="mt-3 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt>Threshold</dt>
                  <dd>{(info.threshold * 100).toFixed(0)}%</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>ROC-AUC</dt>
                  <dd>{info.validation.roc_auc.toFixed(3)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>F1</dt>
                  <dd>{info.validation.f1.toFixed(3)}</dd>
                </div>
              </dl>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">Metrics are cross-validation performance, not clinical diagnostic accuracy.</p>
    </section>
  )
}

