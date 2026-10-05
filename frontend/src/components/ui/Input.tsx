import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  unit?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, hint, error, unit, readOnly, ...props }, ref) => {
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium leading-none text-[var(--text)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              readOnly && "bg-[var(--surface-muted)] cursor-not-allowed",
              error && "border-[var(--danger)] focus-visible:ring-[var(--danger)]",
              unit && "pr-10",
              className
            )}
            ref={ref}
            readOnly={readOnly}
            {...props}
          />
          {unit && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-[var(--text-muted)] pointer-events-none">
              {unit}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p className={cn("text-xs", error ? "text-[var(--danger)]" : "text-[var(--text-muted)]")}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
