import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FileText, Play, ArrowRight, AlertCircle } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { Card, CardHeader, CardTitle, CardBody } from "../../../components/ui/Card"
import { EmptyState } from "../../../components/ui/EmptyState"
import { RiskOverview } from "../../analysis/components/RiskOverview"
import { VesselCards } from "../../analysis/components/VesselCards"
import { normalizeAnalysis } from "../../analysis/normalizeAnalysis"
import { mapShapData } from "../../analysis/shapMapper"
import { analyzePatient } from "../../../services/cardioApi"
import { useUpdatePatient } from "../../patients/hooks"
import type { Patient } from "../../../types/api"

interface AnalysisTabProps {
  patient: Patient
}

export function AnalysisTab({ patient }: AnalysisTabProps) {
  const navigate = useNavigate()
  const updatePatient = useUpdatePatient()
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasAnalysis = !!patient.analysis_data
  const clinicalFieldsCount = patient.clinical_data ? Object.keys(patient.clinical_data).filter(k => k !== "name" && k !== "age" && k !== "sex").length : 0
  const isComplete = clinicalFieldsCount >= 53

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const payload = {
        ...patient.clinical_data,
        age: patient.age,
        sex: patient.gender
      }
      const analysisData = await analyzePatient(payload as any)
      
      await updatePatient.mutateAsync({
        id: patient.id,
        payload: {
          clinical_data: patient.clinical_data,
          // @ts-ignore
          analysis_data: analysisData
        }
      })
    } catch (e: any) {
      setError(e.message || "Failed to run analysis.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!hasAnalysis && !isComplete) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={AlertCircle}
          title="Assessment Incomplete"
          description={`This patient has ${clinicalFieldsCount} of 53 required clinical features filled out. The model requires a complete assessment to generate an analysis.`}
          action={
            <Button onClick={() => navigate(`/assessment/${patient.id}`)}>
              Continue assessment
            </Button>
          }
        />
      </div>
    )
  }

  if (!hasAnalysis && isComplete) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={FileText}
          title="Ready for Analysis"
          description="Clinical data is complete. Run the AI model to generate risk predictions and visualizations."
          action={
            <div className="flex flex-col items-center gap-4">
              <Button onClick={handleRunAnalysis} loading={isAnalyzing} size="lg">
                <Play className="w-4 h-4 mr-2" />
                Run Analysis
              </Button>
              {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
            </div>
          }
        />
      </div>
    )
  }

  // Parse analysis data safely
  let analysis
  try {
    analysis = normalizeAnalysis(patient.analysis_data)
  } catch (e) {
    return <EmptyState icon={AlertCircle} title="Error" description="Failed to parse analysis data." />
  }

  // Prepare top 5 SHAP contributors
  const shapData = mapShapData(analysis.explanations.CAD)
  const topIncreasing = shapData.filter(d => d.contribution > 0).slice(0, 5)
  const topDecreasing = shapData.filter(d => d.contribution < 0).slice(0, 5)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-[var(--text)]">Analysis Summary</h2>
        <Button variant="primary" onClick={() => navigate(`/analysis/${patient.id}`)}>
          Open full report <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <RiskOverview predictions={analysis.predictions} />
      
      {/* Vessel Cards in read-only mode (pass dummy onSelect and no active vessel) */}
      <VesselCards 
        visualization={analysis.visualization} 
        selectedVessel={"LAD"} // Default
        onSelectVessel={() => {}} // Read-only on this view
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top CAD Risk Contributors</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
            {/* Increasing */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-[var(--danger)] mb-3 flex items-center">
                <span className="w-2 h-2 rounded-full bg-[var(--danger)] mr-2"></span>
                Increasing Risk
              </h4>
              <div className="space-y-2">
                {topIncreasing.map(c => (
                  <div key={c.feature} className="flex justify-between items-center text-sm py-1 border-b border-[var(--border)] last:border-0">
                    <span className="text-[var(--text)] font-medium truncate pr-4" title={c.name}>{c.name}</span>
                    <span className="text-[var(--danger)] font-mono shrink-0">+{c.contribution.toFixed(3)}</span>
                  </div>
                ))}
                {topIncreasing.length === 0 && <p className="text-sm text-[var(--text-muted)]">None found</p>}
              </div>
            </div>
            {/* Decreasing */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-[var(--primary)] mb-3 flex items-center">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] mr-2"></span>
                Decreasing Risk
              </h4>
              <div className="space-y-2">
                {topDecreasing.map(c => (
                  <div key={c.feature} className="flex justify-between items-center text-sm py-1 border-b border-[var(--border)] last:border-0">
                    <span className="text-[var(--text)] font-medium truncate pr-4" title={c.name}>{c.name}</span>
                    <span className="text-[var(--primary)] font-mono shrink-0">{c.signed_contribution.toFixed(3)}</span>
                  </div>
                ))}
                {topDecreasing.length === 0 && <p className="text-sm text-[var(--text-muted)]">None found</p>}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      
      <div className="text-xs text-[var(--text-muted)] text-center pt-4">
        Model version: {analysis.model_version} &bull; Disclaimer: This analysis is an AI estimate based on clinical features and should not replace professional medical judgement.
      </div>
    </div>
  )
}
