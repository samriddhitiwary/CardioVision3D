import { useNavigate } from "react-router-dom"
import { Card, CardBody, CardHeader, CardTitle } from "../../../components/ui/Card"
import { Button } from "../../../components/ui/Button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table"
import type { Patient } from "../../../types/api"
import { normalizeAnalysis } from "../../analysis/normalizeAnalysis"
import { RiskBadge } from "./RiskBadge"
import { formatDate } from "../../../lib/format"

interface RecentAssessmentsProps {
  patients: Patient[]
}

export function RecentAssessments({ patients }: RecentAssessmentsProps) {
  const navigate = useNavigate()

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Recent Assessments</CardTitle>
      </CardHeader>
      <CardBody className="p-0 pt-0 md:pt-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Age / Sex</TableHead>
                <TableHead>CAD Risk</TableHead>
                <TableHead>Highest Vessel</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-[var(--text-muted)]">
                    No recent assessments
                  </TableCell>
                </TableRow>
              ) : (
                patients.map(patient => {
                  let band = "Not assessed"
                  let highestVesselStr = "-"
                  
                  if (patient.analysis_data) {
                    try {
                      const analysis = normalizeAnalysis(patient.analysis_data)
                      band = analysis.predictions.CAD.visualization_band
                      
                      const vessels = [
                        { name: "LAD", prob: analysis.predictions.LAD.probability },
                        { name: "LCX", prob: analysis.predictions.LCX.probability },
                        { name: "RCA", prob: analysis.predictions.RCA.probability },
                      ]
                      const highestVessel = vessels.reduce((acc, v) => v.prob > acc.prob ? v : acc, vessels[0])
                      highestVesselStr = highestVessel.name
                    } catch (e) {
                      // ignore parse errors
                    }
                  }

                  const age = patient.clinical_data.age || "-"
                  const sex = patient.clinical_data.sex === 1 ? "M" : patient.clinical_data.sex === 0 ? "F" : "-"
                  const name = `Patient #${patient.id.substring(0, 6)}`

                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{age} / {sex}</TableCell>
                      <TableCell><RiskBadge band={band} /></TableCell>
                      <TableCell>{highestVesselStr}</TableCell>
                      <TableCell>{formatDate(patient.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => navigate(`/records/${patient.id}`)}>
                            Record
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            disabled={!patient.analysis_data}
                            onClick={() => navigate(`/analysis/${patient.id}`)}
                          >
                            Report
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )
}
