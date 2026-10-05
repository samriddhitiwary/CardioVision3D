import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { usePatient } from "../../features/patients/hooks"
import { PageHeader } from "../../components/layout/PageHeader"
import { Button } from "../../components/ui/Button"

export function PatientRecordPlaceholder() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { data: patient, isLoading } = usePatient(patientId)

  const name = patient?.name || patient?.clinical_data?.name || (patient ? `Patient #${patient.id}` : "")

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Button variant="ghost" onClick={() => navigate("/records")} className="pl-0 -ml-2 text-[var(--text-muted)] hover:text-[var(--text)]">
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to Records
      </Button>
      
      {isLoading ? (
        <div className="animate-pulse h-10 w-64 bg-[var(--surface-muted)] rounded" />
      ) : (
        <PageHeader 
          title={name || "Patient Record"} 
          description="Phase 07 placeholder"
        />
      )}
      
      <div className="p-8 border border-[var(--border)] border-dashed rounded-[var(--radius-card)] text-center text-[var(--text-muted)] flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-xl font-medium mb-2">Patient Details Workspace</h2>
        <p>This view will be implemented in Phase 07.</p>
      </div>
    </div>
  )
}
