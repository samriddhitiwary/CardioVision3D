import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Users, FileCheck, AlertCircle, FileX, Plus, RefreshCw } from "lucide-react"
import { PageHeader } from "../../components/layout/PageHeader"
import { Button } from "../../components/ui/Button"
import { Alert } from "../../components/ui/Alert"
import { EmptyState } from "../../components/ui/EmptyState"
import { dashboardApi } from "../../features/dashboard/dashboardApi"
import { computeDashboardStats } from "../../features/dashboard/stats"
import { useCurrentDoctor } from "../../features/auth/useCurrentDoctor"
import { StatCard } from "../../features/dashboard/components/StatCard"
import { RiskDistributionChart } from "../../features/dashboard/components/RiskDistributionChart"
import { HighestVesselChart } from "../../features/dashboard/components/HighestVesselChart"
import { Watchlist } from "../../features/dashboard/components/Watchlist"
import { RecentAssessments } from "../../features/dashboard/components/RecentAssessments"
import { ModelInfoCard } from "../../features/dashboard/components/ModelInfoCard"

export function DashboardPage() {
  const navigate = useNavigate()
  const { displayName } = useCurrentDoctor()

  const { 
    data: patients, 
    isLoading: patientsLoading, 
    isError: patientsError, 
    refetch: refetchPatients 
  } = useQuery({
    queryKey: ["patients", "all"],
    queryFn: dashboardApi.fetchAllPatients,
    staleTime: 5 * 60 * 1000,
  })

  const { 
    data: modelInfo, 
    isLoading: modelLoading, 
    isError: modelError,
    refetch: refetchModel 
  } = useQuery({
    queryKey: ["model-info"],
    queryFn: dashboardApi.fetchModelInfo,
    staleTime: Infinity,
  })

  // Compute stats safely
  const stats = patients ? computeDashboardStats(patients) : null

  // Empty state handling
  if (patients && patients.length === 0 && !patientsLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Dashboard" 
          description={`Welcome back, ${displayName}`}
        />
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Start by creating your first patient assessment."
          action={
            <Button onClick={() => navigate("/assessment/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New Assessment
            </Button>
          }
        >
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left border-t border-[var(--border)] pt-8">
            <div className="p-4 bg-[var(--surface-muted)] rounded-lg">
              <div className="font-bold text-[var(--primary)] mb-2">1. Enter Data</div>
              <p className="text-sm text-[var(--text-muted)]">Input patient clinical parameters and upload CT scans if available.</p>
            </div>
            <div className="p-4 bg-[var(--surface-muted)] rounded-lg">
              <div className="font-bold text-[var(--primary)] mb-2">2. Run Analysis</div>
              <p className="text-sm text-[var(--text-muted)]">Our AI model computes CAD probabilities and vessel-specific risks.</p>
            </div>
            <div className="p-4 bg-[var(--surface-muted)] rounded-lg">
              <div className="font-bold text-[var(--primary)] mb-2">3. Review Report</div>
              <p className="text-sm text-[var(--text-muted)]">Explore 3D visualizations and read the AI-generated risk narrative.</p>
            </div>
          </div>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <PageHeader 
        title="Dashboard" 
        description={`Welcome back, ${displayName}`}
        actions={
          <Button onClick={() => navigate("/assessment/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        }
      />

      {patientsError && (
        <Alert variant="error" title="Failed to load patients">
          <div className="flex items-center gap-4">
            <p>Could not fetch patient records.</p>
            <Button variant="secondary" size="sm" onClick={() => refetchPatients()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Alert if patients exist but none are assessed */}
      {stats && stats.total > 0 && stats.assessed === 0 && (
        <Alert variant="warning" title="No assessments found">
          You have {stats.total} patient record(s), but none have been analyzed yet. Run an assessment to populate risk statistics.
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={stats?.total || 0} icon={Users} loading={patientsLoading} />
        <StatCard title="Assessed" value={stats?.assessed || 0} icon={FileCheck} loading={patientsLoading} />
        <StatCard title="High Risk" value={stats?.highRiskCount || 0} icon={AlertCircle} loading={patientsLoading} />
        <StatCard title="Not Assessed" value={stats?.notAssessed || 0} icon={FileX} loading={patientsLoading} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <RiskDistributionChart 
              bandCounts={stats?.bandCounts || { Low: 0, Moderate: 0, High: 0 }} 
              notAssessed={stats?.notAssessed || 0} 
            />
          </div>
          <div className="flex-1">
            <HighestVesselChart 
              byHighestVessel={stats?.byHighestVessel || { LAD: 0, LCX: 0, RCA: 0 }} 
            />
          </div>
        </div>
        
        {/* Right Column (Watchlist) */}
        <div className="lg:col-span-1 h-[380px]">
          <Watchlist patients={stats?.watchlist || []} />
        </div>
      </div>

      {/* Recent Table */}
      <RecentAssessments patients={stats?.recent || []} />

      {/* Model Info */}
      {modelError && (
        <Alert variant="error" title="Failed to load model info">
          <div className="flex items-center gap-4">
            <p>Could not fetch AI model details.</p>
            <Button variant="secondary" size="sm" onClick={() => refetchModel()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        </Alert>
      )}
      {modelLoading ? (
        <div className="h-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg animate-pulse mt-6" />
      ) : modelInfo ? (
        <ModelInfoCard modelInfo={modelInfo} />
      ) : null}
    </div>
  )
}
