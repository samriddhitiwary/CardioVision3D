import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        info: "bg-[var(--primary-soft)] text-[var(--primary)]",
        success: "bg-green-100 text-[var(--success)]",
        warning: "bg-orange-100 text-[var(--warning)]",
        danger: "bg-red-100 text-[var(--danger)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  band: 'low' | 'moderate' | 'high'
}

function RiskBadge({ className, band, ...props }: RiskBadgeProps) {
  const styles = {
    low: {
      bg: "bg-[var(--risk-low-soft)]",
      text: "text-[var(--risk-low-ink)]",
      dot: "bg-[var(--risk-low)]",
      label: "Low"
    },
    moderate: {
      bg: "bg-[var(--risk-moderate-soft)]",
      text: "text-[var(--risk-moderate-ink)]",
      dot: "bg-[var(--risk-moderate)]",
      label: "Moderate"
    },
    high: {
      bg: "bg-[var(--risk-high-soft)]",
      text: "text-[var(--risk-high-ink)]",
      dot: "bg-[var(--risk-high)]",
      label: "High"
    }
  }[band]

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", 
        styles.bg, 
        styles.text,
        className
      )} 
      {...props}
    >
      <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
      {styles.label}
    </div>
  )
}

export { Badge, badgeVariants, RiskBadge }
