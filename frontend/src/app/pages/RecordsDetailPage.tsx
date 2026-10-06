import { useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { usePatient, useDeletePatient } from "../../features/patients/hooks"
import { useActivePatient } from "../../features/patients/ActivePatientContext"
import { RecordHeader } from "../../features/records/components/RecordHeader"
import { ClinicalInputsTab } from "../../features/records/components/ClinicalInputsTab"
import { AnalysisTab } from "../../features/records/components/AnalysisTab"
import { RiskStoryTab } from "../../features/records/components/RiskStoryTab"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs"
import { AlertCircle } from "lucide-react"
import { EmptyState } from "../../components/ui/EmptyState"
import { Button } from "../../components/ui/Button"

export function RecordsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const currentTab = searchParams.get("tab") || "inputs"

  const { data: patient, isLoading, isError, error } = usePatient(id)
  const deletePatient = useDeletePatient()
  const { activePatientId, setActivePatientId } = useActivePatient()

  // Keep global active patient context synced with URL if we load successfully
  useEffect(() => {
    if (patient && String(patient.id) !== activePatientId) {
      setActivePatientId(String(patient.id))
    }
  }, [patient, activePatientId, setActivePatientId])

  // Clear active patient if 404
  useEffect(() => {
    if (isError && (error as any)?.response?.status === 404) {
      if (activePatientId === id) {
        setActivePatientId(null)
      }
    }
  }, [isError, error, activePatientId, id, setActivePatientId])

  const handleDelete = async () => {
    if (id) {
      await deletePatient.mutateAsync(id)
      navigate("/records")
    }
  }

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val }, { replace: true })
  }

  if (isLoading) {
    return <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading record...</div>
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
        <EmptyState
          icon={AlertCircle}
          title="Record not found"
          description="The patient record you are looking for does not exist or you do not have permission to view it."
          action={
            <Button onClick={() => navigate("/records")}>
              Back to Records
            </Button>
          }
        />
      </div>
    )
  }

  if (!patient) return null

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <RecordHeader patient={patient} onDelete={handleDelete} />
      
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto pb-2 hide-scrollbar">
          <TabsList className="w-max md:w-auto flex md:inline-flex mb-2">
            <TabsTrigger value="inputs" className="px-6 rounded-full">Clinical Inputs</TabsTrigger>
            <TabsTrigger value="analysis" className="px-6 rounded-full">Analysis</TabsTrigger>
            <TabsTrigger value="story" className="px-6 rounded-full">Risk Story</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="mt-4">
          <TabsContent value="inputs" className="m-0 focus-visible:ring-0">
            <ClinicalInputsTab patient={patient} />
          </TabsContent>
          <TabsContent value="analysis" className="m-0 focus-visible:ring-0">
            <AnalysisTab patient={patient} />
          </TabsContent>
          <TabsContent value="story" className="m-0 focus-visible:ring-0">
            <RiskStoryTab patient={patient} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
