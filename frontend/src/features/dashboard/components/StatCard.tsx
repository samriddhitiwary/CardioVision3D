import { Card, CardBody } from "../../../components/ui/Card"

interface StatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}

export function StatCard({ title, value, icon: Icon, loading }: StatCardProps) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardBody className="p-6 flex items-center gap-4">
        <div className="p-3 bg-[var(--primary-soft)] rounded-full text-[var(--primary)] shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-[var(--surface-muted)] animate-pulse rounded mt-1" />
          ) : (
            <p className="text-3xl font-bold tabular-nums text-[var(--text)] mt-1">{value.toLocaleString()}</p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
