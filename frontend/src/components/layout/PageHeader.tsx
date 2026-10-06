import * as React from "react"
import { usePageTitle } from "../../hooks/usePageTitle"

export function PageHeader({ title, description, actions }: { title: string, description?: string, actions?: React.ReactNode }) {
  const h1Ref = usePageTitle(title)

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[var(--border)] mb-6">
      <div>
        <h1 ref={h1Ref} tabIndex={-1} className="text-2xl font-bold tracking-tight text-[var(--text)] outline-none">{title}</h1>
        {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
