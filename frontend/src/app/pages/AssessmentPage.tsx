import { AssessmentWizard } from "../../features/assessment/AssessmentWizard"
import { PageHeader } from "../../components/layout/PageHeader"

export function AssessmentPage() {
  return (
    <div className="pt-4 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <PageHeader title="New Assessment" description="Fill out the clinical parameters below to generate a new CAD risk analysis." />
      <AssessmentWizard />
    </div>
  )
}
