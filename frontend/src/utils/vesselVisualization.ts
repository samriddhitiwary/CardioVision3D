import type { VisualizationBand } from '../types/api'

export interface VesselPresentation {
  color: string
  emissive: string
  emissiveIntensity: number
  opacity: number
  roughness: number
  metalness: number
}

const bandBase: Record<VisualizationBand, { color: string; emissive: string; floor: number }> = {
  low: { color: '#38bdf8', emissive: '#075985', floor: 0.14 },
  moderate: { color: '#f59e0b', emissive: '#92400e', floor: 0.2 },
  high: { color: '#e11d48', emissive: '#9f1239', floor: 0.28 },
}

export function vesselPresentation(
  probability: number,
  visualizationBand: VisualizationBand = 'low',
  isSelected = false,
  isHovered = false,
): VesselPresentation {
  const clamped = Math.min(1, Math.max(0, probability))
  const base = bandBase[visualizationBand]
  const interactionBoost = (isSelected ? 0.28 : 0) + (isHovered ? 0.18 : 0)

  return {
    color: base.color,
    emissive: base.emissive,
    emissiveIntensity: Math.min(0.95, base.floor + clamped * 0.46 + interactionBoost),
    opacity: Math.min(1, 0.82 + clamped * 0.1 + (isSelected || isHovered ? 0.08 : 0)),
    roughness: 0.42,
    metalness: 0.04,
  }
}
