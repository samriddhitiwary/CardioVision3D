import * as React from "react"
import { cn } from "../../lib/utils"

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  label?: string
  valueLabel?: string
}

export function ProgressBar({ value, max = 100, label, valueLabel, className, ...props }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  return (
    <div className={cn("w-full", className)} {...props}>
      {(label || valueLabel) && (
        <div className="flex justify-between items-center mb-1.5 text-sm">
          {label && <span className="font-medium text-[var(--text)]">{label}</span>}
          {valueLabel && <span className="text-[var(--text-muted)]">{valueLabel}</span>}
        </div>
      )}
      <div className="h-2.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-[var(--primary)] transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
