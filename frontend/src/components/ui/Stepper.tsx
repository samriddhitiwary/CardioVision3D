import * as React from "react"
import { Check, AlertCircle } from "lucide-react"
import { cn } from "../../lib/utils"

export type StepState = "complete" | "current" | "upcoming" | "error"

export interface Step {
  id: string
  title: string
  state: StepState
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[]
}

export function Stepper({ steps, className, ...props }: StepperProps) {
  const currentIndex = steps.findIndex(s => s.state === "current")
  const activeIndex = currentIndex === -1 ? steps.length - 1 : currentIndex
  
  return (
    <div className={cn("w-full", className)} {...props}>
      {/* Mobile view: Step X of N */}
      <div className="md:hidden mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-[var(--text)]">
            Step {activeIndex + 1} of {steps.length}
          </span>
          <span className="text-sm font-medium text-[var(--primary)]">
            {steps[activeIndex]?.title}
          </span>
        </div>
        <div className="h-2 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop view: Horizontal Steps */}
      <nav aria-label="Progress" className="hidden md:block">
        <ol role="list" className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className={cn("relative", stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : "")}>
              <div className="flex items-center">
                <div
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full border-2",
                    step.state === "complete" ? "border-[var(--primary)] bg-[var(--primary)]" :
                    step.state === "current" ? "border-[var(--primary)] bg-[var(--surface)]" :
                    step.state === "error" ? "border-[var(--danger)] bg-[var(--surface)]" :
                    "border-[var(--border)] bg-[var(--surface)]"
                  )}
                >
                  {step.state === "complete" ? (
                    <Check className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : step.state === "error" ? (
                    <AlertCircle className="h-5 w-5 text-[var(--danger)]" aria-hidden="true" />
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        step.state === "current" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
                      )}
                    >
                      {stepIdx + 1}
                    </span>
                  )}
                </div>
                <div className="ml-3 flex flex-col hidden sm:block">
                  <span className={cn(
                    "text-sm font-medium",
                    step.state === "current" ? "text-[var(--primary)]" : 
                    step.state === "error" ? "text-[var(--danger)]" : "text-[var(--text)]"
                  )}>
                    {step.title}
                  </span>
                </div>
              </div>
              {stepIdx !== steps.length - 1 && (
                <div className="absolute top-4 left-0 -ml-px mt-0.5 h-0.5 w-full bg-[var(--border)] -z-10" aria-hidden="true">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      step.state === "complete" ? "bg-[var(--primary)] w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
