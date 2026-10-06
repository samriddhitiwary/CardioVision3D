import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Edit3, FileText, DownloadCloud, AlertTriangle, Info } from "lucide-react"

import { usePatient } from "../../features/patients/hooks"
import { useAnalysis, useRiskStory } from "../../features/analysis/hooks"
import { Button } from "../../components/ui/Button"
import { HeartVisualization } from "../../components/heart/HeartVisualization"
import { RiskOverview } from "../../features/analysis/components/RiskOverview"
import { VesselCards } from "../../features/analysis/components/VesselCards"
import { ShapView } from "../../features/analysis/components/ShapView"
import { RiskStoryView } from "../../features/analysis/components/RiskStoryView"
import type { VesselKey } from "../../types/api"

export function AnalysisPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  
  const { data: patient, isLoading: isPatientLoading } = usePatient(patientId)
  const { data: analysis, isLoading: isAnalysisLoading, error: analysisError } = useAnalysis(patientId)
  const { data: story, isLoading: isStoryLoading, isError: isStoryError, regenerate } = useRiskStory(patientId)

  const [selectedVessel, setSelectedVessel] = useState<VesselKey | null>(null)
  const [touchOverlay, setTouchOverlay] = useState(true)

  if (isPatientLoading || isAnalysisLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
        <p className="text-[var(--text-muted)] font-medium">Loading analysis report...</p>
      </div>
    )
  }

  // Handle incomplete assessment
  if (analysisError && analysisError.message === "INCOMPLETE_ASSESSMENT") {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <div className="bg-[var(--warning-soft)] text-[var(--warning)] p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text)] mb-4">Assessment Incomplete</h2>
        <p className="text-[var(--text-muted)] mb-8">
          This patient does not have all 55 required clinical features filled out. 
          The model requires a complete assessment to generate an analysis.
        </p>
        <Button onClick={() => navigate(`/assessment/${patientId}`)}>
          Resume Assessment
        </Button>
      </div>
    )
  }

  if (analysisError || !analysis) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--danger)]">Failed to load analysis. Please try again.</p>
      </div>
    )
  }

  // Derive highest risk vessel for default selection
  const vessels: VesselKey[] = ["LAD", "LCX", "RCA"]
  let highestRisk = -1
  let highestVessel: VesselKey = "LAD"
  vessels.forEach(v => {
    if (analysis.visualization[v].probability > highestRisk) {
      highestRisk = analysis.visualization[v].probability
      highestVessel = v
    }
  })

  const activeVessel = selectedVessel || highestVessel

  const handleSelectVessel = (vessel: VesselKey) => {
    setSelectedVessel(vessel)
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 animate-in fade-in duration-500 space-y-8">
      {/* 1. Patient banner + actions */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold">
            {patient?.name?.[0] || "?"}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{patient?.name || "Unknown Patient"}</h1>
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
              {patient?.age} yrs &bull; {patient?.gender} &bull; ID: {patient?.id}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono bg-[var(--surface-muted)] text-[var(--text-muted)] px-2 py-1 rounded border border-[var(--border)] mr-2">
            Model: {analysis.model_version}
          </span>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/assessment/${patientId}`)}>
            <Edit3 className="w-4 h-4 mr-2" /> Edit inputs
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/records`)}>
            <FileText className="w-4 h-4 mr-2" /> Open record
          </Button>
          <div title="Available in Phase 08">
            <Button variant="primary" size="sm" disabled>
              <DownloadCloud className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Risk overview row */}
      <div className="space-y-6">
        <RiskOverview predictions={analysis.predictions} />
        <VesselCards 
          visualization={analysis.visualization} 
          selectedVessel={activeVessel} 
          onSelectVessel={handleSelectVessel} 
        />
      </div>

      {/* 3. 3D heart section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative">
          <div data-heart-canvas>
            <HeartVisualization
              ladRisk={analysis.visualization.LAD.probability}
              lcxRisk={analysis.visualization.LCX.probability}
              rcaRisk={analysis.visualization.RCA.probability}
              ladBand={analysis.visualization.LAD.visualization_band}
              lcxBand={analysis.visualization.LCX.visualization_band}
              rcaBand={analysis.visualization.RCA.visualization_band}
              ladThreshold={analysis.visualization.LAD.threshold}
              lcxThreshold={analysis.visualization.LCX.threshold}
              rcaThreshold={analysis.visualization.RCA.threshold}
              selectedVessel={activeVessel}
              onSelectVessel={handleSelectVessel}
            />
            
            {/* Mobile scroll trap overlay */}
            <div 
              className={`absolute inset-0 z-20 bg-black/5 flex items-center justify-center transition-opacity md:hidden ${touchOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setTouchOverlay(false)}
            >
              <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg font-medium text-sm">
                Tap to interact with 3D model
              </div>
            </div>
            
            {!touchOverlay && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-4 right-4 z-20 md:hidden shadow-md"
                onClick={() => setTouchOverlay(true)}
              >
                Exit 3D View
              </Button>
            )}
          </div>
          
          <div className="mt-3 flex items-start sm:items-center gap-2 sm:gap-6 text-xs text-[var(--text-muted)] p-2">
            <span className="font-semibold uppercase tracking-wider">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[var(--protective)]" /> Low &lt; 33%
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]" /> Moderate 33–66%
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[var(--risk-high)]" /> High &ge; 66%
            </div>
            <span className="ml-auto italic hidden sm:inline-block text-right">Colours show model-estimated risk bands, not clinical severity.</span>
          </div>
          <span className="italic sm:hidden block mt-1 text-xs text-center text-[var(--text-muted)]">Colours show model-estimated risk bands, not clinical severity.</span>
        </div>

        {/* Selected vessel panel (side) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] p-6 rounded-[var(--radius-card)] border border-[var(--border)] shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-1">Selected Vessel: {activeVessel}</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">Top contributing factors driving risk for {activeVessel}</p>
            
            <div className="flex-1 space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--danger)] mb-3">Top Increasing Factors</h4>
                <div className="space-y-2">
                  {analysis.explanations[activeVessel].top_increasing_contributors.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-[var(--danger-soft)]/30 border border-[var(--danger)]/20">
                      <span className="font-medium">{c.ui_label}</span>
                      <span className="text-[var(--danger)] font-bold">+{c.contribution.toFixed(3)}</span>
                    </div>
                  ))}
                  {analysis.explanations[activeVessel].top_increasing_contributors.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)]">None found</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--success)] mb-3">Top Decreasing Factors</h4>
                <div className="space-y-2">
                  {analysis.explanations[activeVessel].top_decreasing_contributors.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-[var(--success-soft)]/30 border border-[var(--success)]/20">
                      <span className="font-medium">{c.ui_label}</span>
                      <span className="text-[var(--success)] font-bold">-{c.contribution.toFixed(3)}</span>
                    </div>
                  ))}
                  {analysis.explanations[activeVessel].top_decreasing_contributors.length === 0 && (
                    <p className="text-sm text-[var(--text-muted)]">None found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Explainability (SHAP) */}
      <ShapView explanations={analysis.explanations} />

      {/* 6. AI Risk Story */}
      {story && (
        <RiskStoryView 
          story={story} 
          isLoading={isStoryLoading} 
          isError={isStoryError} 
          onRegenerate={regenerate} 
          onSelectVessel={handleSelectVessel}
          modelInfo={{ model_version: analysis.model_version }}
        />
      )}

      {/* 7. Footer disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-900 flex items-start mt-12">
        <Info className="w-5 h-5 mr-3 shrink-0 text-blue-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">Clinical Decision Support Only</p>
          <p>
            {analysis.disclaimer || "CardioTwin provides model-estimated predictions based on provided clinical features. It is a decision support tool and does not replace professional medical judgment. Always correlate these predictions with actual patient presentation and imaging."}
          </p>
        </div>
      </div>
    </div>
  )
}
