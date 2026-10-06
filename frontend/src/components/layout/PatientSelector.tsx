import React, { useState, useMemo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ChevronsUpDown, Search, Plus } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Avatar, AvatarFallback } from "../ui/Avatar"
import { usePatients } from "../../features/patients/hooks"
import { useActivePatient as useActivePatientCtx } from "../../features/patients/ActivePatientContext"
import { getAnalysis, getHighestBand } from "../../features/patients/patientView"
import { RiskBadge } from "../../features/dashboard/components/RiskBadge"
import type { Patient } from "../../types/api"

export function PatientSelector() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const navigate = useNavigate()
  const location = useLocation()
  
  const { activePatientId, setActivePatientId, activePatient } = useActivePatientCtx()
  const { data: patients = [], isLoading } = usePatients()

  const filteredPatients = useMemo(() => {
    if (!search) return patients
    const lower = search.toLowerCase()
    return patients.filter(p => {
      // name logic - backend has no name, so fallback `Patient #${p.id}` or check clinical_data
      const name = p.name || p.clinical_data?.name || `Patient #${p.id}`
      return name.toLowerCase().includes(lower)
    })
  }, [patients, search])

  const handleSelect = (id: string | number) => {
    setActivePatientId(String(id))
    setOpen(false)
    setSearch("")

    // Route logic
    const path = location.pathname
    if (path.startsWith("/analysis/")) navigate(`/analysis/${id}`)
    else if (path.startsWith("/records/")) navigate(`/records/${id}`)
    else if (path.startsWith("/assessment/")) navigate(`/assessment/${id}`)
  }

  const activeName = activePatient?.name || activePatient?.clinical_data?.name || (activePatient ? `Patient #${activePatient.id}` : "")
  const activeAge = activePatient?.age ?? activePatient?.clinical_data?.age ?? "?"
  const activeSex = (activePatient?.gender?.startsWith("M") || activePatient?.clinical_data?.sex === 1) ? "M" : "F"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="secondary" 
          role="combobox" 
          aria-label="Select patient"
          aria-expanded={open} 
          className="w-full md:w-[260px] justify-between h-12 bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
        >
          {activePatient ? (
            <div className="flex items-center gap-3 overflow-hidden text-left">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--primary-soft)] text-[var(--primary)] text-xs">
                  {activeName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium truncate">{activeName}</span>
                <span className="text-xs text-[var(--text-muted)]">{activeAge} y/o • {activeSex}</span>
              </div>
            </div>
          ) : (
            <span className="text-[var(--text-muted)]">Select patient...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b border-[var(--border)] px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input 
            placeholder="Search patients..." 
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="flex-1 border-0 focus-visible:ring-0 shadow-none rounded-none px-0 h-10 bg-transparent"
          />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto py-1">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">Loading patients...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--text-muted)]">No patients found.</div>
          ) : (
            filteredPatients.map((p: Patient) => {
              const name = p.name || p.clinical_data?.name || `Patient #${p.id}`
              const age = p.age ?? p.clinical_data?.age ?? "?"
              const sex = (p.gender?.startsWith("M") || p.clinical_data?.sex === 1) ? "M" : "F"
              const band = getHighestBand(getAnalysis(p))
              const isSelected = activePatientId === String(p.id)
              
              return (
                <div 
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`flex items-center justify-between p-2 mx-1 rounded-sm cursor-pointer text-sm ${isSelected ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'hover:bg-[var(--surface-hover)]'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="flex flex-col truncate">
                      <span className="font-medium truncate">{name}</span>
                      <span className="text-xs text-[var(--text-muted)] opacity-80">{age} y/o • {sex}</span>
                    </div>
                  </div>
                  {p.analysis_data && (
                    <div className="shrink-0 scale-75 origin-right">
                      <RiskBadge band={band} />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
        
        <div className="p-2 border-t border-[var(--border)]">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-[var(--primary)]"
            onClick={() => {
              setOpen(false)
              navigate("/assessment/new")
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New patient
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
