import { format, formatDistanceToNow } from "date-fns"

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return "-"
  return format(new Date(date), "MMM d, yyyy")
}

export function formatRelative(date: string | Date | undefined): string {
  if (!date) return "-"
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
