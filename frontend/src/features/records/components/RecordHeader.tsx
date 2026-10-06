import { useNavigate } from "react-router-dom"
import { ArrowLeft, Edit3, FileText, DownloadCloud, Trash2, Calendar } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { Avatar, AvatarFallback } from "../../../components/ui/Avatar"
import { PatientSelector } from "../../../components/layout/PatientSelector"
import { RiskBadge } from "../../dashboard/components/RiskBadge"
import { getAnalysis, getHighestBand } from "../../patients/patientView"
import { formatDate } from "../../../lib/format"
import type { Patient } from "../../../types/api"

interface RecordHeaderProps {
  patient: Patient
  onDelete: () => void
}

export function RecordHeader({ patient, onDelete }: RecordHeaderProps) {
  const navigate = useNavigate()
  
  const name = patient.name || patient.clinical_data?.name || `Patient #${patient.id}`
  const initials = name.substring(0, 2).toUpperCase()
  const age = patient.age ?? patient.clinical_data?.age ?? "?"
  const sex = (patient.gender?.startsWith("M") || patient.clinical_data?.sex === 1) ? "M" : "F"
  
  const analysis = getAnalysis(patient)
  const band = getHighestBand(analysis)
  
  const filledFields = patient.clinical_data 
    ? Object.keys(patient.clinical_data).filter(k => k !== "name" && k !== "age" && k !== "sex").length 
    : 0
  const totalFields = 53 // Based on feature config excluding name, age, sex
  const completion = Math.min(filledFields, totalFields)

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this patient record? This action cannot be undone.")) {
      onDelete()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/records")} className="text-[var(--text-muted)] -ml-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Records
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex flex-col md:flex-row items-start gap-4">
          <Avatar className="h-16 w-16 shadow-sm border border-[var(--border)]">
            <AvatarFallback className="bg-[var(--primary-soft)] text-[var(--primary)] text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[var(--text)]">{name}</h1>
              <div className="hidden md:block w-[240px]">
                <PatientSelector />
              </div>
            </div>
            <div className="text-sm font-medium text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
              <span>{age} yrs &bull; {sex}</span>
              <span>&bull;</span>
              <span>ID: {patient.id}</span>
              <span>&bull;</span>
              <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {formatDate(patient.created_at)}</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <RiskBadge band={band} />
              <span className="text-xs text-[var(--text-muted)]">
                {completion}/{totalFields} clinical inputs
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/assessment/${patient.id}`)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit inputs
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/analysis/${patient.id}`)}>
            <FileText className="w-4 h-4 mr-2" />
            Open full report
          </Button>
          <div title="Available in Phase 08">
            <Button variant="secondary" size="sm" disabled>
              <DownloadCloud className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      <div className="md:hidden block">
        <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Switch Patient</p>
        <PatientSelector />
      </div>
    </div>
  )
}
