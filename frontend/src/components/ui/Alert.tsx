import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react"
import { cn } from "../../lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        info: "bg-[var(--primary-soft)] border-[var(--primary-soft)] text-[var(--primary)] [&>svg]:text-[var(--primary)]",
        success: "bg-green-50 border-green-50 text-[var(--success)] [&>svg]:text-[var(--success)]",
        warning: "bg-orange-50 border-orange-50 text-[var(--warning)] [&>svg]:text-[var(--warning)]",
        error: "bg-red-50 border-red-50 text-[var(--danger)] [&>svg]:text-[var(--danger)]",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "info", title, children, ...props }, ref) => {
    const Icon = icons[variant || "info"]
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-5 w-5" />
        {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
        <div className="text-sm [&_p]:leading-relaxed">{children}</div>
      </div>
    )
  }
)
Alert.displayName = "Alert"

export { Alert, alertVariants }
