import { CheckCircle2, ClipboardList, Loader2 } from 'lucide-react'
import type { FormErrors, FormValues, PatientFieldConfig } from '../../../types/patient'
import { fieldSections, patientFields } from '../../../utils/patientFields'

interface PatientFormProps {
  values: FormValues
  errors: FormErrors
  isSubmitting: boolean
  onChange: (alias: string, value: string) => void
  onLoadDemo: () => void
  onSubmit: () => void
}

function FieldControl({ field, value, error, onChange }: {
  field: PatientFieldConfig
  value: string
  error?: string
  onChange: (alias: string, value: string) => void
}) {
  const id = `field-${field.alias}`
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center justify-between gap-3 text-sm font-medium text-slate-800">
        <span>{field.label}</span>
        <span className="text-xs font-normal text-slate-400">Required</span>
      </label>
      {field.type === 'number' ? (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(field.alias, event.target.value)}
          className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-rose-600 focus:ring-2 focus:ring-rose-100 ${
            error ? 'border-rose-400' : 'border-slate-200'
          }`}
        />
      ) : (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(field.alias, event.target.value)}
          className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-rose-600 focus:ring-2 focus:ring-rose-100 ${
            error ? 'border-rose-400' : 'border-slate-200'
          }`}
        >
          <option value="">Select</option>
          {field.allowedValues?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
    </div>
  )
}

export function PatientForm({ values, errors, isSubmitting, onChange, onLoadDemo, onSubmit }: PatientFormProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Patient Clinical Profile</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Clinical input form</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Complete the frozen 55-field model schema. Demo Patient is synthetic and intended only for workflow demonstration.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadDemo}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          Load Demo Patient
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {fieldSections.map((section) => {
          const fields = patientFields.filter((field) => field.section === section.id)
          return (
            <details key={section.id} className="group" open={section.id === 'profile' || section.id === 'history'}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{section.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {fields.length} fields
                </span>
              </summary>
              <div className="grid gap-4 px-5 pb-6 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map((field) => (
                  <FieldControl
                    key={field.alias}
                    field={field}
                    value={values[field.alias] ?? ''}
                    error={errors[field.alias]}
                    onChange={onChange}
                  />
                ))}
              </div>
            </details>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          {patientFields.length} required fields represented
        </div>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Analyze Cardiovascular Risk
        </button>
      </div>
    </section>
  )
}

