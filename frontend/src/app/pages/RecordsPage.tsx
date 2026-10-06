import { useState, useMemo, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Search, Plus, Filter, MoreVertical, FileText, Activity, Edit, Trash2, ExternalLink, DownloadCloud } from "lucide-react"
import { PageHeader } from "../../components/layout/PageHeader"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/DropdownMenu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/Dialog"
import { ProgressBar } from "../../components/ui/ProgressBar"
import { EmptyState } from "../../components/ui/EmptyState"
import { RiskBadge } from "../../features/dashboard/components/RiskBadge"
import { usePatients, useDeletePatient } from "../../features/patients/hooks"
import { useActivePatient } from "../../features/patients/ActivePatientContext"
import { getAnalysis, getHighestBand, getCompletion } from "../../features/patients/patientView"
import { formatDate, formatPercent } from "../../lib/format"
import type { Patient } from "../../types/api"

export function RecordsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: patients = [], isLoading } = usePatients()
  const { activePatientId, setActivePatientId } = useActivePatient()
  const deleteMutation = useDeletePatient()
  
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // URL state
  const urlQuery = searchParams.get("q") || ""
  const sexFilter = searchParams.get("sex") || "All"
  const statusFilter = searchParams.get("status") || "All"
  const riskFilter = searchParams.get("risk") || "All"
  const sortBy = searchParams.get("sort") || "Newest"

  const [localQuery, setLocalQuery] = useState(urlQuery)

  useEffect(() => {
    setLocalQuery(urlQuery)
  }, [urlQuery])

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value && value !== "All") newParams.set(key, value)
    else newParams.delete(key)
    setSearchParams(newParams)
  }

  // Filter and sort logic
  const filteredPatients = useMemo(() => {
    let result = [...patients]

    if (urlQuery) {
      const lowerQ = urlQuery.toLowerCase()
      result = result.filter(p => {
        const name = (p.name || p.clinical_data?.name || `Patient #${p.id}`).toLowerCase()
        return name.includes(lowerQ)
      })
    }

    if (sexFilter !== "All") {
      result = result.filter(p => {
        const isMale = p.gender?.startsWith("M") || p.clinical_data?.sex === 1
        return sexFilter === "Male" ? isMale : !isMale
      })
    }

    if (statusFilter !== "All") {
      result = result.filter(p => {
        const hasAnalysis = !!p.analysis_data
        return statusFilter === "Assessed" ? hasAnalysis : !hasAnalysis
      })
    }

    if (riskFilter !== "All") {
      result = result.filter(p => {
        const band = getHighestBand(getAnalysis(p))
        return band === riskFilter
      })
    }

    result.sort((a, b) => {
      if (sortBy === "Newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === "Name A-Z") {
        const nameA = a.name || a.clinical_data?.name || `Patient #${a.id}`
        const nameB = b.name || b.clinical_data?.name || `Patient #${b.id}`
        return nameA.localeCompare(nameB)
      }
      if (sortBy === "CAD Risk") {
        const probA = getAnalysis(a)?.predictions.CAD.probability || -1
        const probB = getAnalysis(b)?.predictions.CAD.probability || -1
        return probB - probA
      }
      return 0
    })

    return result
  }, [patients, urlQuery, sexFilter, statusFilter, riskFilter, sortBy])

  const handleDelete = () => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        if (activePatientId === String(deleteId)) {
          setActivePatientId(null)
        }
        setDeleteId(null)
      }
    })
  }

  const renderActions = (p: Patient) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4 text-[var(--text-muted)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(`/records/${p.id}`)}>
          <FileText className="mr-2 h-4 w-4" /> View record
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/analysis/${p.id}`)} disabled={!p.analysis_data}>
          <Activity className="mr-2 h-4 w-4" /> Open report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/assessment/${p.id}`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit inputs
        </DropdownMenuItem>
        
        {p.pdf_link ? (
          <DropdownMenuItem onClick={() => window.open(p.pdf_link!, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="mr-2 h-4 w-4" /> Open PDF
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => navigate(`/analysis/${p.id}?autoexport=1`)}>
            <DownloadCloud className="mr-2 h-4 w-4" /> Generate report
          </DropdownMenuItem>
        )}

        <div className="h-px bg-[var(--border)] my-1" />
        <DropdownMenuItem onClick={() => setDeleteId(String(p.id))} className="text-[var(--danger)] focus:text-[var(--danger)]">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (patients.length === 0 && !isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Patient Records" 
          actions={
            <Button onClick={() => navigate("/assessment/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Assessment
            </Button>
          }
        />
        <EmptyState
          icon={FileText}
          title="No patients found"
          description="You haven't added any patients yet."
          action={
            <Button onClick={() => navigate("/assessment/new")}>
              New Patient
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Patient Records" 
        actions={
          <Button onClick={() => navigate("/assessment/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        }
      />

      <div className="flex flex-col gap-4 bg-[var(--surface)] p-4 rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input 
              placeholder="Search patients..." 
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value)
                updateParam("q", e.target.value)
              }}
              className="pl-9 w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--text-muted)]" />
              <select 
                className="h-10 px-3 py-2 bg-transparent border border-[var(--border)] rounded-md text-sm outline-none focus:border-[var(--primary)] text-[var(--text)]"
                value={sexFilter}
                onChange={(e) => updateParam("sex", e.target.value)}
              >
                <option value="All">All Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <select 
              className="h-10 px-3 py-2 bg-transparent border border-[var(--border)] rounded-md text-sm outline-none focus:border-[var(--primary)] text-[var(--text)]"
              value={statusFilter}
              onChange={(e) => updateParam("status", e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Assessed">Assessed</option>
              <option value="Not assessed">Not Assessed</option>
            </select>
            <select 
              className="h-10 px-3 py-2 bg-transparent border border-[var(--border)] rounded-md text-sm outline-none focus:border-[var(--primary)] text-[var(--text)]"
              value={riskFilter}
              onChange={(e) => updateParam("risk", e.target.value)}
            >
              <option value="All">All Risks</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
              <option value="Low">Low</option>
            </select>
            <div className="h-6 w-px bg-[var(--border)] mx-1" />
            <select 
              className="h-10 px-3 py-2 bg-transparent border border-[var(--border)] rounded-md text-sm outline-none focus:border-[var(--primary)] font-medium text-[var(--text)]"
              value={sortBy}
              onChange={(e) => updateParam("sort", e.target.value)}
            >
              <option value="Newest">Newest First</option>
              <option value="Name A-Z">Name A-Z</option>
              <option value="CAD Risk">CAD Risk</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface)] rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-muted)] animate-pulse">Loading records...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center">
            <p className="text-[var(--text-muted)] mb-4">No patients match your filters.</p>
            <Button variant="secondary" onClick={() => setSearchParams(new URLSearchParams())}>Clear Filters</Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>CAD Risk</TableHead>
                    <TableHead>Highest Vessel</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map(p => {
                    const name = p.name || p.clinical_data?.name || `Patient #${p.id}`
                    const age = p.age ?? p.clinical_data?.age ?? "-"
                    const sex = (p.gender?.startsWith("M") || p.clinical_data?.sex === 1) ? "Male" : "Female"
                    const analysis = getAnalysis(p)
                    const cadProb = analysis ? analysis.predictions.CAD.probability : null
                    const { filled, total } = getCompletion(p)
                    
                    let highestVesselStr = "-"
                    if (analysis) {
                      const vessels = [
                        { name: "LAD", prob: analysis.predictions.LAD.probability },
                        { name: "LCX", prob: analysis.predictions.LCX.probability },
                        { name: "RCA", prob: analysis.predictions.RCA.probability },
                      ]
                      highestVesselStr = vessels.reduce((acc, v) => v.prob > acc.prob ? v : acc, vessels[0]).name
                    }

                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-[var(--surface-hover)]" onClick={() => navigate(`/records/${p.id}`)}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{age}</TableCell>
                        <TableCell>{sex}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ProgressBar value={(filled / total) * 100} className="w-16 h-2" />
                            <span className="text-xs text-[var(--text-muted)]">{filled}/{total}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RiskBadge band={analysis?.predictions.CAD.visualization_band} />
                            {cadProb !== null && <span className="text-xs font-medium">{formatPercent(cadProb)}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{highestVesselStr}</TableCell>
                        <TableCell className="text-[var(--text-muted)]">{formatDate(p.created_at)}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          {renderActions(p)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-[var(--border)]">
              {filteredPatients.map(p => {
                const name = p.name || p.clinical_data?.name || `Patient #${p.id}`
                const age = p.age ?? p.clinical_data?.age ?? "?"
                const sex = (p.gender?.startsWith("M") || p.clinical_data?.sex === 1) ? "M" : "F"
                const analysis = getAnalysis(p)
                const cadProb = analysis ? analysis.predictions.CAD.probability : null

                return (
                  <div key={p.id} className="p-4 flex items-start justify-between" onClick={() => navigate(`/records/${p.id}`)}>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{name}</span>
                      <span className="text-sm text-[var(--text-muted)]">{age} y/o • {sex} • {formatDate(p.created_at)}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <RiskBadge band={analysis?.predictions.CAD.visualization_band} />
                        {cadProb !== null && <span className="text-xs font-medium">{formatPercent(cadProb)}</span>}
                      </div>
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      {renderActions(p)}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this patient and all their associated clinical data, 3D scans, and analysis reports? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
