// No unused imports
import { AlertCircle } from "lucide-react"

export function DisclaimerBar() {
  return (
    <div className="bg-[var(--surface-muted)] px-4 py-2 text-center text-xs text-[var(--text-muted)] border-b border-[var(--border)] flex items-center justify-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>This system is an investigational tool providing decision support. It does not replace professional clinical judgment.</span>
    </div>
  )
}
