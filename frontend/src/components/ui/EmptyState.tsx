import * as React from "react"
import { cn } from "../../lib/utils"
import type { LucideIcon } from "lucide-react"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div 
      className={cn("flex flex-col items-center justify-center p-8 text-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]", className)} 
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] shadow-sm mb-4">
        <Icon className="h-6 w-6 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
