import { useNavigate } from "react-router-dom"
import { AlertCircle } from "lucide-react"
import { PageHeader } from "../../components/layout/PageHeader"
import { EmptyState } from "../../components/ui/EmptyState"
import { Button } from "../../components/ui/Button"

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="404 Not Found" />
      <EmptyState 
        icon={AlertCircle}
        title="Page not found"
        description="The page you are looking for doesn't exist or has been moved."
        action={
          <Button onClick={() => navigate("/")}>
            Return Home
          </Button>
        }
      />
    </div>
  )
}
