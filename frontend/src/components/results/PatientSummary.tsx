import type { FormValues } from '../../types/patient'
import { fieldByAlias } from '../../utils/patientFields'

interface PatientSummaryProps {
  values: FormValues
}

const summaryAliases = ['age', 'sex', 'bmi', 'bp', 'typical_chest_pain', 'dm', 'htn', 'tg', 'ldl', 'hdl', 'ef_tte']

export function PatientSummary({ values }: PatientSummaryProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Submitted Profile</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Clinical measurements summary</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryAliases.map((alias) => (
          <div key={alias} className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">{fieldByAlias[alias]?.label ?? alias}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{values[alias] || 'Not entered'}</p>
          </div>
        ))}
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-rose-700">View all inputs</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(values).map(([alias, value]) => (
            <div key={alias} className="rounded border border-slate-200 px-3 py-2 text-xs">
              <span className="font-semibold text-slate-700">{fieldByAlias[alias]?.label ?? alias}: </span>
              <span className="text-slate-600">{value}</span>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}

