import type { VisualizationBand } from '../types/api'

export const bandStyles: Record<VisualizationBand, { label: string; text: string; bg: string; bar: string; border: string }> = {
  low: {
    label: 'Low',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    bar: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  moderate: {
    label: 'Moderate',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    bar: 'bg-amber-500',
    border: 'border-amber-200',
  },
  high: {
    label: 'High',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    bar: 'bg-rose-600',
    border: 'border-rose-200',
  },
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

