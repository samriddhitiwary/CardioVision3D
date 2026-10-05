import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams, useBlocker } from "react-router-dom"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Save, Play, ClipboardList, AlertCircle } from "lucide-react"

import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { SegmentedControl } from "../../components/ui/SegmentedControl"
import { Stepper } from "../../components/ui/Stepper"
import { ProgressBar } from "../../components/ui/ProgressBar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/Dialog"
import { usePatient, useCreatePatient, useUpdatePatient } from "../patients/hooks"
import { useActivePatient } from "../patients/ActivePatientContext"
import { apiErrorMessage, analyzePatient } from "../../services/cardioApi"
import { useMutation } from "@tanstack/react-query"
import { 
  assessmentSteps, 
  assessmentFields, 
  stepSchemas, 
  fullAssessmentSchema, 
  PRESET_DEMO
} from "./featureConfig"
import type { AssessmentFormValues, FieldConfig } from "./featureConfig"

interface AssessmentWizardProps {}

export function AssessmentWizard({}: AssessmentWizardProps) {
  const { patientId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEditing = !!patientId && patientId !== "new"
  
  const initialStep = parseInt(searchParams.get("step") || "1", 10)
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"saved" | "error" | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  const { setActivePatientId } = useActivePatient()
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId)
  
  const createPatient = useCreatePatient()
  const updatePatient = useUpdatePatient()

  // Form setup
  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(fullAssessmentSchema as any),
    mode: "onTouched",
    defaultValues: {
      exertional_cp: "N", // Fixed
    }
  })

  const isDirty = Object.keys(form.formState.dirtyFields).length > 0
  
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  )

  // Prefill on load
  useEffect(() => {
    if (isEditing && patient) {
      form.reset({
        name: patient.name || "",
        age: patient.age,
        sex: patient.gender === "Fmale" ? "Fmale" : "Male",
        ...patient.clinical_data,
        exertional_cp: "N", // Ensure fixed
      })
    }
  }, [isEditing, patient, form])

  // Sync step param
  useEffect(() => {
    setSearchParams({ step: currentStep.toString() }, { replace: true })
  }, [currentStep, setSearchParams])

  // Derived fields: BMI and Obesity
  const weight = form.watch("weight")
  const length = form.watch("length")
  const [obesityTouched, setObesityTouched] = useState(false)

  useEffect(() => {
    if (weight && length) {
      const hM = length / 100
      const bmi = weight / (hM * hM)
      const roundedBmi = Math.round(bmi * 100) / 100
      form.setValue("bmi", roundedBmi, { shouldValidate: form.formState.isSubmitted })
      
      if (!obesityTouched) {
        form.setValue("obesity", roundedBmi >= 30 ? "Y" : "N")
      }
    } else {
      form.setValue("bmi", undefined as any)
    }
  }, [weight, length, form, obesityTouched])

  const fieldsForStep = assessmentFields.filter(f => f.step === currentStep)
  const isReviewStep = currentStep === 9

  const getStepSchemaKeys = (stepId: number) => {
    if (stepId === 9) return []
    return Object.keys((stepSchemas as any)[stepId].shape) as (keyof AssessmentFormValues)[]
  }

  const validateCurrentStep = async () => {
    if (isReviewStep) return true
    const keys = getStepSchemaKeys(currentStep)
    return await form.trigger(keys)
  }

  const performSave = async (data: AssessmentFormValues) => {
    setIsSaving(true)
    setSaveStatus(null)
    
    // Separate core fields from clinical data
    const { name, age, sex, ...clinicalData } = data
    
    // Clean undefined/empty values from clinicalData to avoid overriding with nulls if not needed, 
    // but React Hook Form handles undefined omission mostly.
    const cleanClinicalData = Object.fromEntries(
      Object.entries(clinicalData).filter(([_, v]) => v !== undefined && v !== "")
    )
    // If editing, preserve unknown keys
    const finalClinicalData = isEditing && patient?.clinical_data 
      ? { ...patient.clinical_data, ...cleanClinicalData } 
      : cleanClinicalData

    try {
      if (!isEditing) {
        // Step 1: Create
        const res = await createPatient.mutateAsync({
          name: name as string,
          age: age as number,
          gender: sex as string,
          clinical_data: finalClinicalData
        })
        setActivePatientId(res.id)
        setSaveStatus("saved")
        return res.id
      } else {
        // Update
        await updatePatient.mutateAsync({
          id: patientId!,
          payload: {
            name: name as string,
            age: age as number,
            gender: sex as string,
            clinical_data: finalClinicalData
          }
        })
        setSaveStatus("saved")
        return patientId!
      }
    } catch (err) {
      setSaveStatus("error")
      throw err
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (!isValid) return

    try {
      const data = form.getValues()
      const newId = await performSave(data)
      
      if (!isEditing) {
        navigate(`/assessment/${newId}?step=2`, { replace: true })
        setCurrentStep(2)
      } else {
        form.reset({}, { keepValues: true }) // clear dirty state
        setCurrentStep(prev => Math.min(prev + 1, 9))
      }
    } catch (e) {
      // Save failed, handled by performSave
    }
  }

  const handleSaveDraft = async () => {
    // Save draft doesn't strictly validate current step, but we should at least trigger to show errors
    // Actually, backend needs age/sex if we are creating. If step 1 is invalid, we can't create.
    if (!isEditing) {
      const isValid = await form.trigger(["name", "age", "sex"])
      if (!isValid) return
    }
    
    try {
      await performSave(form.getValues())
      form.reset({}, { keepValues: true })
    } catch (e) {
      // Handled
    }
  }

  const loadPreset = () => {
    if (Object.keys(form.formState.dirtyFields).length > 0) {
      if (!confirm("Overwrite current form values with demo patient data?")) return
    }
    form.reset(PRESET_DEMO as any)
    setObesityTouched(true)
  }

  const filledFieldsCount = Object.keys(form.watch()).filter(k => form.watch(k as keyof AssessmentFormValues) !== undefined && form.watch(k as keyof AssessmentFormValues) !== "").length
  const totalFieldsCount = assessmentFields.length // 55

  // Analysis
  const analyzeMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create full 55-key object
      const payload: Record<string, any> = {}
      assessmentFields.forEach(f => {
        if (f.key !== "name" && f.key !== "age" && f.key !== "sex") {
          payload[f.key] = data[f.key]
        }
      })
      payload.age = data.age
      payload.sex = data.sex
      
      return await analyzePatient(payload)
    },
    onSuccess: async () => {
      // Try to save analysis_data back to patient
      try {
        await updatePatient.mutateAsync({
          id: patientId!,
          payload: {
            clinical_data: patient!.clinical_data,
            // @ts-ignore - The api interface might need analysis_data
          }
        })
        // NOTE: Our backend might not allow direct PUT of analysis_data or it creates an Analysis record.
        // Dashboard uses POST /api/v1/analyze. 
      } catch (e) {
        console.warn("Could not save analysis data to patient model, continuing.")
      }
      navigate(`/analysis/${patientId}`)
    },
    onError: (err) => {
      setAnalysisError(apiErrorMessage(err))
    }
  })

  const handleRunAnalysis = async () => {
    const isValid = await form.trigger()
    if (!isValid) return

    setAnalysisError(null)
    try {
      await performSave(form.getValues())
      form.reset({}, { keepValues: true })
      analyzeMutation.mutate(form.getValues())
    } catch (e) {}
  }

  // UI helpers
  const stepperSteps = [...assessmentSteps, { id: 9, title: "Review & Analyze", shortTitle: "Review" }].map(s => ({
    id: s.id.toString(),
    title: s.title,
    state: s.id < currentStep ? "complete" as const : s.id === currentStep ? "current" as const : "upcoming" as const
  }))

  const renderField = (field: FieldConfig) => {
    const error = form.formState.errors[field.key as keyof AssessmentFormValues]?.message as string

    if (field.control === "text" || field.control === "number") {
      return (
        <div key={field.key} className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text)] flex justify-between">
            <span>{field.label} {field.unit && <span className="text-[var(--text-muted)]">({field.unit})</span>}</span>
          </label>
          <Input
            {...form.register(field.key as keyof AssessmentFormValues)}
            type={field.control === "number" ? "number" : "text"}
            disabled={field.readOnly || field.disabled}
            placeholder={field.hint || (field.range ? `${field.range[0]} - ${field.range[1]}` : "")}
            className={error ? "border-[var(--danger)]" : ""}
          />
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
      )
    }

    if (field.control === "segmented") {
      return (
        <Controller
          key={field.key}
          name={field.key as any}
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <SegmentedControl
              name={field.key}
              label={field.label}
              options={field.options || []}
              value={value}
              onChange={(val) => {
                onChange(val)
                if (field.key === "obesity") setObesityTouched(true)
              }}
              error={error}
            />
          )}
        />
      )
    }

    if (field.control === "select") {
      return (
        <div key={field.key} className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--text)]">{field.label}</label>
          <select
            {...form.register(field.key as any)}
            disabled={field.disabled}
            className={`w-full h-11 rounded-[var(--radius-input)] border bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] ${error ? 'border-[var(--danger)]' : 'border-[var(--border)]'}`}
          >
            <option value="">Select...</option>
            {field.options?.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
      )
    }
    return null
  }

  if (isLoadingPatient) {
    return <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading patient...</div>
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" onClick={() => navigate("/records")} className="pl-0 -ml-2 text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Records
        </Button>
        <Button variant="secondary" onClick={loadPreset} size="sm">
          <ClipboardList className="mr-2 h-4 w-4" /> Load Preset
        </Button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
        {/* Top Progress Area */}
        <div className="p-6 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <Stepper steps={stepperSteps} className="mb-6" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-muted)]">Form Completion</span>
            <span className="text-sm font-medium text-[var(--text)]">{filledFieldsCount} / {totalFieldsCount} fields</span>
          </div>
          <ProgressBar value={(filledFieldsCount / totalFieldsCount) * 100} className="mt-2" />
        </div>

        {/* Form Area */}
        <div className="p-6 md:p-8">
          {Object.keys(form.formState.errors).length > 0 && !isReviewStep && (
            <div className="mb-6 p-4 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
              <div>
                <p className="text-sm font-medium">Please correct the errors before continuing.</p>
              </div>
            </div>
          )}

          {!isReviewStep ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {fieldsForStep.map(renderField)}
            </div>
          ) : (
            <ReviewStep form={form} setStep={setCurrentStep} />
          )}

          {analysisError && (
            <div className="mt-6 p-4 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] flex items-start">
              <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
              <div>
                <p className="text-sm font-medium">Analysis failed</p>
                <p className="text-sm mt-1">{analysisError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-4 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="secondary" 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || isSaving || analyzeMutation.isPending}
            >
              Back
            </Button>
            
            <div className="text-sm text-[var(--text-muted)] hidden sm:block">
              {isSaving ? "Saving..." : saveStatus === "saved" ? "Saved • just now" : saveStatus === "error" ? "Couldn't save" : ""}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSaveDraft} disabled={isSaving || analyzeMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save Draft
            </Button>
            
            {!isReviewStep ? (
              <Button onClick={handleNext} loading={isSaving}>
                Next Step
              </Button>
            ) : (
              <Button onClick={handleRunAnalysis} loading={analyzeMutation.isPending || isSaving}>
                <Play className="mr-2 h-4 w-4" /> Run Analysis
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={blocker.state === "blocked"} onOpenChange={(open) => !open && blocker.state === "blocked" && blocker.reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>
              You have unsaved changes in your assessment. Are you sure you want to leave?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="secondary" onClick={() => blocker.state === "blocked" && blocker.reset()}>Stay</Button>
            <Button variant="danger" onClick={() => blocker.state === "blocked" && blocker.proceed()}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewStep({ form, setStep }: { form: any, setStep: (s: number) => void }) {
  const values = form.getValues()
  
  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-xl font-semibold mb-2 text-[var(--text)]">Review & Run Analysis</h2>
        <p className="text-sm text-[var(--text-muted)]">Please review the clinical data before running the AI models. Missing required fields are highlighted.</p>
      </div>

      <div className="space-y-6">
        {assessmentSteps.map(step => {
          const stepFields = assessmentFields.filter(f => f.step === step.id)
          return (
            <div key={step.id} className="border border-[var(--border)] rounded-[var(--radius-card)] overflow-hidden">
              <div className="bg-[var(--surface-muted)] p-4 flex justify-between items-center border-b border-[var(--border)]">
                <h3 className="font-medium text-[var(--text)]">{step.title}</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep(step.id)}>Edit</Button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stepFields.map(f => {
                  const val = values[f.key]
                  const isMissing = val === undefined || val === ""
                  
                  let displayVal = val
                  if (!isMissing && (f.control === "select" || f.control === "segmented")) {
                    const opt = f.options?.find(o => o.value === val)
                    displayVal = opt ? opt.label : val
                  }

                  return (
                    <div key={f.key} className="flex flex-col">
                      <span className="text-xs text-[var(--text-muted)] mb-1">{f.label}</span>
                      {isMissing ? (
                        <span className="text-xs font-medium text-[var(--danger)] bg-[var(--danger-soft)] px-2 py-0.5 rounded-full w-fit">Missing</span>
                      ) : (
                        <span className="text-sm font-medium text-[var(--text)]">{displayVal} {f.unit}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
