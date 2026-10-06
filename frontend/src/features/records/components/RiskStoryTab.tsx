import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { EmptyState } from "../../../components/ui/EmptyState"
import { RiskStoryView } from "../../analysis/components/RiskStoryView"
import { useRiskStory } from "../../analysis/hooks"
import type { Patient } from "../../../types/api"

interface RiskStoryTabProps {
  patient: Patient
}

export function RiskStoryTab({ patient }: RiskStoryTabProps) {
  const navigate = useNavigate()
  
  // Try to use cached story from patient record
  const cachedStoryStr = (patient.risk_story as any)?.story || (typeof patient.risk_story === 'string' ? patient.risk_story : null)
  const hasCachedStory = typeof cachedStoryStr === "string" && cachedStoryStr.length > 0

  const [isGenerating, setIsGenerating] = useState(false)
  const [showFetched, setShowFetched] = useState(false)

  // This will fetch ONLY if we don't have a cached one AND the user clicks "Generate", 
  // or we can use the mutation directly.
  const { data: fetchedStory, error, regenerate, isError } = useRiskStory(
    showFetched ? patient.id : undefined // conditionally enable hook
  )

  const handleGenerate = () => {
    setIsGenerating(true)
    setShowFetched(true) // enables the hook which triggers fetch
  }

  const handleRegenerate = async () => {
    setIsGenerating(true)
    await regenerate()
    setIsGenerating(false)
  }

  // Effect to turn off loading when fetched story arrives
  if (isGenerating && fetchedStory && showFetched) {
    setIsGenerating(false)
  }
  if (isGenerating && isError && showFetched) {
    setIsGenerating(false)
  }

  const storyData: any = showFetched ? fetchedStory : (hasCachedStory ? { story: cachedStoryStr, model: (patient.risk_story as any)?.model } : null)

  const clinicalFieldsCount = patient.clinical_data ? Object.keys(patient.clinical_data).filter(k => k !== "name" && k !== "age" && k !== "sex").length : 0
  const isComplete = clinicalFieldsCount >= 53

  if (!isComplete) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={AlertCircle}
          title="Assessment Incomplete"
          description="The AI narrative requires a complete clinical assessment to provide context."
          action={
            <Button onClick={() => navigate(`/assessment/${patient.id}`)}>
              Continue assessment
            </Button>
          }
        />
      </div>
    )
  }

  if (!storyData && !isGenerating && !isError) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={Sparkles}
          title="AI Risk Narrative"
          description="Generate a personalized, natural-language explanation of this patient's CAD risk based on their clinical inputs."
          action={
            <Button onClick={handleGenerate} size="lg" className="bg-[var(--primary)] text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Risk Story
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* The view handles its own header if needed, but since we have one, we just render the view */}
      <RiskStoryView
        story={storyData as any}
        isLoading={isGenerating}
        isError={isError}
        onRegenerate={handleRegenerate}
      />
    </div>
  )
}
