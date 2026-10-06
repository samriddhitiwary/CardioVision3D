import * as React from "react"
import { cn } from "../../lib/utils"

export interface SegmentedControlOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  name: string
  options: SegmentedControlOption[]
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
}

const SegmentedControl = React.forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ className, name, options, value, onChange, label, error, ...props }, ref) => {
    return (
      <div className="flex w-full flex-col gap-1.5" ref={ref} {...props}>
        {label && (
          <label className="text-sm font-medium leading-none text-[var(--text)]">
            {label}
          </label>
        )}
        <div
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-[var(--radius-input)] bg-[var(--surface-muted)] p-1 text-[var(--text-muted)]",
            className
          )}
          role="radiogroup"
        >
          {options.map((option) => {
            const isSelected = value === option.value
            return (
              <label
                key={option.value}
                className={cn(
                  "relative flex flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                  isSelected ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "hover:bg-[var(--border)] hover:text-[var(--text)]",
                  option.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--text-muted)]"
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => !option.disabled && onChange?.(option.value)}
                  disabled={option.disabled}
                  className="sr-only"
                />
                {option.label}
              </label>
            )
          })}
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      </div>
    )
  }
)
SegmentedControl.displayName = "SegmentedControl"

export { SegmentedControl }
