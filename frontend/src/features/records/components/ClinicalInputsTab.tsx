import React, { useState, useEffect } from "react"
import { Search, ChevronDown } from "lucide-react"
import { Input } from "../../../components/ui/Input"
import { assessmentSteps, assessmentFields } from "../../assessment/featureConfig"
import type { Patient } from "../../../types/api"

interface ClinicalInputsTabProps {
  patient: Patient
}

export function ClinicalInputsTab({ patient }: ClinicalInputsTabProps) {
  const [search, setSearch] = useState("")
  const clinicalData = patient.clinical_data || {}
  
  // Need to merge age and sex since they are at root
  const fullData: Record<string, any> = {
    ...clinicalData,
    age: patient.age,
    sex: patient.gender?.startsWith("M") ? "Male" : "Fmale" // Map back to feature config expected values if necessary, or just render directly
  }

  // Filter fields based on search
  const filteredFields = assessmentFields.filter(f => {
    if (!search) return true
    return f.label.toLowerCase().includes(search.toLowerCase())
  })

  // Group fields by step
  const fieldsByStep = assessmentSteps.map(step => ({
    step,
    fields: filteredFields.filter(f => f.step === step.id)
  })).filter(group => group.fields.length > 0) // Only show steps that have matching fields

  const renderFieldValue = (value: any, options?: any[], unit?: string, hint?: string) => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-[var(--text-muted)] italic">Not entered</span>
    }

    // Attempt to map segmented/select options
    let displayValue = String(value)
    if (options && options.length > 0) {
      // Find exact match (e.g., "1" or "Y")
      const opt = options.find(o => String(o.value) === String(value))
      if (opt) displayValue = opt.label
    }

    // Special chip rendering for Yes/No
    if (displayValue.toLowerCase() === "yes") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/20">Yes</span>
    }
    if (displayValue.toLowerCase() === "no") {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)]">No</span>
    }

    return (
      <span className="text-[var(--text)] font-medium">
        {displayValue}
        {unit && <span className="text-[var(--text-muted)] font-normal ml-1">{unit}</span>}
        {hint && <span className="text-[var(--text-muted)] text-xs font-normal ml-2">({hint})</span>}
      </span>
    )
  }

  // Determine if it's desktop to default open all details
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-[var(--text)]">Clinical Inputs</h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <Input 
            placeholder="Find a field..." 
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        {fieldsByStep.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] bg-[var(--surface)] rounded-[var(--radius-card)] border border-[var(--border)]">
            No fields match your search.
          </div>
        ) : (
          fieldsByStep.map((group, index) => {
            // Count entered fields for this step
            const totalInStep = assessmentFields.filter(f => f.step === group.step.id).length
            const enteredInStep = assessmentFields.filter(f => f.step === group.step.id && fullData[f.key] !== undefined && fullData[f.key] !== null && fullData[f.key] !== "").length
            
            // Force open if searching, otherwise use default logic (all on desktop, first on mobile)
            const isOpen = search ? true : (isDesktop ? true : index === 0)

            return (
              <details 
                key={group.step.id} 
                className="group bg-[var(--surface)] rounded-[var(--radius-card)] border border-[var(--border)] overflow-hidden shadow-sm"
                open={isOpen}
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors select-none">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-[var(--text)]">
                      Step {group.step.id}: {group.step.title}
                    </h3>
                    <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full">
                      {enteredInStep} of {totalInStep} entered
                    </span>
                  </div>
                  <ChevronDown className="h-5 w-5 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
                </summary>
                
                <div className="p-4 border-t border-[var(--border)] bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                    {group.fields.map(field => (
                      <div key={field.key} className="flex flex-col py-2 border-b border-[var(--border)] sm:border-0 sm:py-0">
                        <span className="text-sm font-medium text-[var(--text-muted)] mb-1">
                          {field.label}
                        </span>
                        <div>
                          {renderFieldValue(fullData[field.key], field.options, field.unit, field.hint)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            )
          })
        )}
      </div>
    </div>
  )
}
