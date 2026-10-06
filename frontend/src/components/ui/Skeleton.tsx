import * as React from "react"
import { cn } from "../../lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "line" | "block"
}

export function Skeleton({ className, variant = "line", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--surface-muted)]",
        variant === "line" ? "h-4 w-full" : "h-32 w-full",
        className
      )}
      {...props}
    />
  )
}
