import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { ExplainabilityPanel } from '../components/explainability/ExplainabilityPanel'
import { HeartVisualization } from '../components/heart/HeartVisualization'
import { TopNav } from '../components/layout/TopNav'
import { PatientForm } from '../components/patient/PatientForm'
import { CadRiskCard } from '../components/results/CadRiskCard'
import { ModelInfoCard } from '../components/results/ModelInfoCard'
import { PatientSummary } from '../components/results/PatientSummary'
import { VesselRiskPanel } from '../components/results/VesselRiskPanel'
import { analyzePatient, apiErrorMessage, getHealth, getModelInfo } from '../services/cardioApi'
import type { AnalyzeResponse, HealthResponse, ModelInfo, PatientInput, TargetKey, VesselKey } from '../types/api'
import type { FormErrors, FormValues } from '../types/patient'
import { demoPatientValues, patientFields } from '../utils/patientFields'

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {}
  for (const field of patientFields) {
    const value = values[field.alias]
    if (value === undefined || value === '') {
      errors[field.alias] = 'Required field'
      continue
    }
    if (field.type === 'number') {
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) {
        errors[field.alias] = 'Enter a valid number'
      }
    }
    if (field.type === 'categorical' && field.allowedValues && !field.allowedValues.includes(value)) {
      errors[field.alias] = `Choose one of: ${field.allowedValues.join(', ')}`
    }
  }
  return errors
}

function toPatientInput(values: FormValues): PatientInput {
  return Object.fromEntries(
    patientFields.map((field) => [field.alias, field.type === 'number' ? Number(values[field.alias]) : values[field.alias]]),
  )
}

function initialValues(): FormValues {
  return Object.fromEntries(patientFields.map((field) => [field.alias, '']))
}

export function DashboardPage() {
  const [values, setValues] = useState<FormValues>(() => initialValues())
  const [errors, setErrors] = useState<FormErrors>({})
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null)
  const [checkingHealth, setCheckingHealth] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedVessel, setSelectedVessel] = useState<VesselKey>('LAD')
  const [selectedExplanation, setSelectedExplanation] = useState<TargetKey>('CAD')
  const resultsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function checkStatus() {
      try {
        const [healthResponse, infoResponse] = await Promise.all([getHealth(), getModelInfo()])
        if (!cancelled) {
          setHealth(healthResponse)
          setModelInfo(infoResponse)
        }
      } catch {
        if (!cancelled) {
          setHealth({ status: 'unavailable', model_version: null, models_loaded: false })
        }
      } finally {
        if (!cancelled) {
          setCheckingHealth(false)
        }
      }
    }
    checkStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const completedCount = useMemo(() => patientFields.filter((field) => values[field.alias] !== '').length, [values])

  function handleChange(alias: string, value: string) {
    setValues((current) => ({ ...current, [alias]: value }))
    setErrors((current) => {
      if (!current[alias]) {
        return current
      }
      const next = { ...current }
      delete next[alias]
      return next
    })
  }

  function handleLoadDemo() {
    setValues(demoPatientValues)
    setErrors({})
    setAnalysis(null)
    setErrorMessage(null)
  }

  async function handleSubmit() {
    const nextErrors = validateForm(values)
    setErrors(nextErrors)
    setErrorMessage(null)
    if (Object.keys(nextErrors).length > 0) {
      return
    }
    setIsSubmitting(true)
    try {
      const response = await analyzePatient(toPatientInput(values))
      setAnalysis(response)
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (error) {
      setErrorMessage(apiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <TopNav health={health} checking={checkingHealth} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">IIT Multimodal AI Hackathon 2026</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
              Cardiovascular risk analysis for clinical AI visualization.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Enter a patient clinical profile, run the frozen CardioTwin v1.0.0 model, and review calibrated CAD and vessel-level risk estimates with model explanations.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">Form progress</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-rose-700" style={{ width: `${(completedCount / patientFields.length) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {completedCount} of {patientFields.length} fields completed
            </p>
          </div>
        </section>

        <PatientForm
          values={values}
          errors={errors}
          isSubmitting={isSubmitting}
          onChange={handleChange}
          onLoadDemo={handleLoadDemo}
          onSubmit={handleSubmit}
        />

        {isSubmitting ? (
          <section className="mt-8 rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <Loader2 className="mt-1 h-5 w-5 animate-spin text-rose-700" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Analyzing cardiovascular risk...</h2>
                <p className="mt-1 text-sm text-slate-600">Evaluating overall CAD risk and coronary vessel patterns.</p>
              </div>
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <section className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          </section>
        ) : null}

        {analysis ? (
          <div ref={resultsRef} className="mt-10 space-y-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Analysis Results</p>
              <h2 className="text-3xl font-semibold text-slate-950">Model risk estimates</h2>
            </div>

            <CadRiskCard prediction={analysis.predictions.CAD} />

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <HeartVisualization
                ladRisk={analysis.predictions.LAD.probability}
                lcxRisk={analysis.predictions.LCX.probability}
                rcaRisk={analysis.predictions.RCA.probability}
                ladBand={analysis.predictions.LAD.visualization_band}
                lcxBand={analysis.predictions.LCX.visualization_band}
                rcaBand={analysis.predictions.RCA.visualization_band}
                ladThreshold={analysis.predictions.LAD.threshold}
                lcxThreshold={analysis.predictions.LCX.threshold}
                rcaThreshold={analysis.predictions.RCA.threshold}
                selectedVessel={selectedVessel}
                onSelectVessel={setSelectedVessel}
              />
              <VesselRiskPanel
                visualization={analysis.visualization}
                selectedVessel={selectedVessel}
                onSelectVessel={setSelectedVessel}
              />
            </div>

            <ExplainabilityPanel
              explanations={analysis.explanations}
              selectedTarget={selectedExplanation}
              onSelectTarget={setSelectedExplanation}
            />

            <PatientSummary values={values} />
            <ModelInfoCard modelInfo={modelInfo} />

            <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
              {analysis.disclaimer}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  )
}
