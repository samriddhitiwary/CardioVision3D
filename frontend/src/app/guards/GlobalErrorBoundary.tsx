import { Component } from "react"
import type { ReactNode } from "react"
import { AlertOctagon } from "lucide-react"
import { Button } from "../../components/ui/Button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
          <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-card)] p-6 shadow-lg text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--danger-soft)] text-[var(--danger)] rounded-full flex items-center justify-center mx-auto">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text)]">Something went wrong</h1>
            <p className="text-sm text-[var(--text-muted)]">
              An unexpected error occurred in the application. Please try reloading the page.
            </p>
            <div className="pt-4">
              <Button onClick={() => window.location.reload()} className="w-full justify-center">
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
