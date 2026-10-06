import { AlertCircle, RefreshCw, Cpu, Database, FileWarning, Play } from "lucide-react"
import { Button } from "../../../components/ui/Button"
import { isFallbackStory } from "../../../services/riskStoryService"
import type { RiskStoryResponse, RiskStoryFactor } from "../../../services/riskStoryService"
import type { VesselKey } from "../../../types/api"

interface RiskStoryViewProps {
  story: RiskStoryResponse
  isLoading: boolean
  isError: boolean
  onRegenerate: () => void
  onSelectVessel?: (vessel: VesselKey) => void
  modelInfo?: { model_version: string }
}

export function RiskStoryView({ story, isLoading, isError, onRegenerate, onSelectVessel, modelInfo }: RiskStoryViewProps) {
  const isFallback = isFallbackStory(story)
  
  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <p className="text-sm font-medium text-[var(--text)]">Generating AI narrative...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex p-4 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)]">
          <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
          <div>
            <p className="text-sm font-medium">Failed to generate AI Risk Story</p>
            <p className="text-sm mt-1">There was a problem communicating with the generation service.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRegenerate}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">AI Risk Story</h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isFallback ? (
              <span className="inline-flex items-center rounded-md bg-[var(--warning-soft)] px-2 py-1 text-xs font-medium text-[var(--warning)] ring-1 ring-inset ring-[var(--warning)]/20">
                <FileWarning className="w-3 h-3 mr-1" />
                Fallback summary
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)] ring-1 ring-inset ring-[var(--primary)]/20">
                <Cpu className="w-3 h-3 mr-1" />
                AI-generated
              </span>
            )}
            <span className="inline-flex items-center rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border)]">
              <Database className="w-3 h-3 mr-1" />
              {modelInfo?.model_version || "cardiotwin-v2"}
            </span>
          </div>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={() => {
            if (confirm("Generating a new story consumes API credits. Continue?")) {
              onRegenerate()
            }
          }}
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </div>

      <div className="p-6 space-y-8">
        {isFallback && (
          <div className="flex p-4 rounded-md bg-[var(--warning-soft)] border border-[var(--warning)] text-yellow-800">
            <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
            <div>
              <p className="text-sm font-medium">The AI narrative is temporarily unavailable.</p>
              <p className="text-sm mt-1">Showing a summary built directly from the model's explanation.</p>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-semibold text-[var(--text)]">{story.headline}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{story.summary}</p>
        </div>

        <div className="rounded-lg bg-[var(--primary-soft)] border border-[var(--primary)]/20 p-4 border-l-4 border-l-[var(--primary)]">
          <p className="text-sm font-medium text-[var(--primary)]">{story.primary_message}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--danger)] mb-4">Increasing Risk</h4>
            <div className="space-y-3">
              {story.positive_factors.map((factor, idx) => (
                <FactorCard key={idx} factor={factor} />
              ))}
              {story.positive_factors.length === 0 && <p className="text-sm text-[var(--text-muted)]">None found</p>}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--success)] mb-4">Decreasing Risk</h4>
            <div className="space-y-3">
              {story.negative_factors.map((factor, idx) => (
                <FactorCard key={idx} factor={factor} />
              ))}
              {story.negative_factors.length === 0 && <p className="text-sm text-[var(--text-muted)]">None found</p>}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Vessel Analysis</h4>
          <div className="grid sm:grid-cols-3 gap-4">
            {story.vessels.map(v => (
              <div key={v.vessel} className="border border-[var(--border)] rounded-md p-4 bg-[var(--surface-muted)] relative">
                {story.highest_risk_vessel === v.vessel && (
                  <span className="absolute -top-2 -right-2 bg-[var(--danger)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Highest Risk
                  </span>
                )}
                <div className="text-xs font-semibold text-[var(--text-muted)]">{v.vessel}</div>
                <div className="text-lg font-bold text-[var(--text)] mt-1">{(v.risk_percent * 100).toFixed(1)}%</div>
                <div className="text-xs mt-1 capitalize text-[var(--text-muted)]">{v.severity} severity</div>
              </div>
            ))}
          </div>
        </div>

        {!isFallback && story.visualization_steps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Guided Walkthrough</h4>
            <ol className="space-y-4 list-decimal list-inside text-sm text-[var(--text-muted)] marker:text-[var(--primary)] marker:font-semibold">
              {story.visualization_steps.map((step, idx) => (
                <li key={idx} className="pl-2">{step}</li>
              ))}
            </ol>
            {story.highest_risk_vessel && (
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-4"
                onClick={() => onSelectVessel?.(story.highest_risk_vessel as VesselKey)}
              >
                <Play className="w-4 h-4 mr-2" />
                Focus {story.highest_risk_vessel} on the heart
              </Button>
            )}
          </div>
        )}

        <p className="text-xs text-[var(--text-muted)] italic mt-6 border-t border-[var(--border)] pt-6">
          {story.disclaimer}
        </p>
      </div>
    </div>
  )
}

function FactorCard({ factor }: { factor: RiskStoryFactor }) {
  const isPositive = factor.direction === "increases_risk"
  return (
    <div className={`p-3 rounded-md border-l-4 bg-[var(--surface)] shadow-sm ${isPositive ? 'border-l-[var(--danger)]' : 'border-l-[var(--success)]'} border border-[var(--border)]`}>
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-sm text-[var(--text)]">{factor.display_name}</span>
        <span className="text-xs font-mono text-[var(--text-muted)]">{factor.value_text}</span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{factor.explanation}</p>
    </div>
  )
}
