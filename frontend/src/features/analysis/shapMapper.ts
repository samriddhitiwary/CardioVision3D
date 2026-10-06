import { assessmentFields } from "../assessment/featureConfig"
import type { AnalyzeResponse } from "../../types/api"

export interface MappedShapContributor {
  feature: string
  raw_value: any
  contribution: number
  signed_contribution: number
  direction: string
  ui_label: string
  name: string
  shortName: string
  value: number
}

export function mapShapData(
  explanation: AnalyzeResponse["explanations"]["CAD"] | undefined
): MappedShapContributor[] {
  if (!explanation) return []
  
  const allContributors = [
    ...explanation.top_increasing_contributors.map(c => ({ ...c, signed_contribution: c.contribution })),
    ...explanation.top_decreasing_contributors.map(c => ({ ...c, signed_contribution: -c.contribution }))
  ]

  // Sort by absolute contribution descending
  allContributors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  return allContributors.map(c => {
    // Find label from featureConfig if possible
    const configField = assessmentFields.find(f => f.key === c.feature)
    const labelName = configField?.label || c.ui_label || c.feature
    let valueStr = c.raw_value !== null ? String(c.raw_value) : "N/A"
    
    // Attempt to map segmented/select values to their labels
    if (configField?.options && c.raw_value !== null) {
      const opt = configField.options.find(o => o.value === String(c.raw_value))
      if (opt) valueStr = opt.label
    }
    
    // Add unit if applicable
    if (configField?.unit && c.raw_value !== null) {
      valueStr += ` ${configField.unit}`
    }

    return {
      ...c,
      name: `${labelName}: ${valueStr}`,
      shortName: labelName.length > 20 ? labelName.substring(0, 17) + "..." : labelName,
      value: c.signed_contribution,
      ui_label: c.ui_label || c.feature
    }
  })
}
