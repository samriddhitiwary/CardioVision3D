import { useEffect } from "react"
import { DownloadCloud, CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../../components/ui/Button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../components/ui/DropdownMenu"
import { useReportExport } from "../useReportExport"

interface ReportExportButtonProps {
  patientId: string | number
  autoExport?: boolean
  pdfLink?: string | null
}

export function ReportExportButton({ patientId, autoExport, pdfLink: initialPdfLink }: ReportExportButtonProps) {
  const { exportReport, status, error, pdfLink: hookPdfLink } = useReportExport()
  
  const currentPdfLink = hookPdfLink || initialPdfLink

  useEffect(() => {
    if (autoExport && status === "idle") {
      handleExport()
    }
  }, [autoExport, status])

  const handleExport = () => {
    // Small timeout to ensure the heart canvas has rendered its latest state if we just loaded
    setTimeout(() => {
      const wrapper = document.querySelector('[data-heart-canvas]')
      const canvasEl = wrapper?.querySelector('canvas') as HTMLCanvasElement | null
      exportReport({ patientId, canvasEl })
    }, 100)
  }

  const handleCopyLink = () => {
    if (currentPdfLink) {
      navigator.clipboard.writeText(currentPdfLink)
      toast.success("Link copied")
    }
  }

  const handleOpenPdf = () => {
    if (currentPdfLink) {
      window.open(currentPdfLink, "_blank", "noopener,noreferrer")
    }
  }

  // Progress states
  const isWorking = status === "capturing" || status === "generating"
  const isReady = status === "ready"
  
  const label = status === "capturing" ? "Capturing 3D view..."
              : status === "generating" ? "Generating PDF..."
              : isReady ? "Open PDF"
              : "Download PDF report"
              
  const Icon = isReady ? CheckCircle2 : (isWorking ? Loader2 : DownloadCloud)

  return (
    <div className="relative group inline-block">
      <div className="flex items-center">
        {isReady ? (
          <Button variant="primary" size="sm" className="rounded-r-none border-r border-r-white/20" onClick={handleOpenPdf}>
            <ExternalLink className="w-4 h-4 mr-2" /> {label}
          </Button>
        ) : (
          <Button 
            variant="primary" 
            size="sm" 
            className="rounded-r-none border-r border-r-white/20" 
            onClick={handleExport}
            disabled={isWorking}
          >
            <Icon className={`w-4 h-4 mr-2 ${isWorking ? 'animate-spin' : ''}`} /> 
            {label}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="primary" size="sm" className="rounded-l-none px-2" disabled={isWorking}>
              <span className="sr-only">Open menu</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                <path d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73379 9.9026 7.61934 9.95001 7.49999 9.95001C7.38064 9.95001 7.26618 9.9026 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport} disabled={isWorking}>
              <DownloadCloud className="w-4 h-4 mr-2" /> Generate new report
            </DropdownMenuItem>
            {currentPdfLink && (
              <>
                <DropdownMenuItem onClick={handleOpenPdf}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Open last generated PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-2" /> Copy link
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Tooltip & Errors */}
      <div className="absolute top-full mt-2 right-0 w-72 z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all pointer-events-none">
        <div className="bg-[var(--surface-muted)] text-[var(--text)] text-xs p-3 rounded shadow-md border border-[var(--border)] relative">
          <div className="absolute -top-1 right-6 w-2 h-2 bg-[var(--surface-muted)] border-t border-l border-[var(--border)] transform rotate-45"></div>
          {error ? (
            <p className="text-[var(--danger)] font-medium">{error}</p>
          ) : (
            <>
              <p className="mb-2"><strong>Tip:</strong> Rotate the heart to the view you want in the report.</p>
              <p className="text-[var(--text-muted)]">The PDF includes clinical inputs, model predictions, ranked contributors and a 3D heart snapshot. It does not include the interactive charts or the AI Risk Story.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
