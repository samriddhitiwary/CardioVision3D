import { Card, CardBody, CardHeader, CardTitle, CardFooter } from "../../../components/ui/Card"
import { Badge } from "../../../components/ui/Badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/Table"
import type { ModelInfo } from "../dashboardApi"
import { Info } from "lucide-react"

interface ModelInfoCardProps {
  modelInfo: ModelInfo
}

export function ModelInfoCard({ modelInfo }: ModelInfoCardProps) {
  return (
    <Card className="mt-6 border-l-4 border-l-[var(--primary)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-[var(--primary)]" />
            Model Information
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="neutral">v{modelInfo.model_version}</Badge>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-1">Trained on {modelInfo.dataset_name}</p>
      </CardHeader>
      
      <CardBody>
        <div className="overflow-x-auto rounded-md border border-[var(--border)] mt-4">
          <Table>
            <TableHeader className="bg-[var(--surface-muted)]">
              <TableRow>
                <TableHead className="py-2">Target</TableHead>
                <TableHead className="py-2">Algorithm</TableHead>
                <TableHead className="py-2">Threshold</TableHead>
                <TableHead className="py-2">Brier Score</TableHead>
                <TableHead className="py-2">Calibration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(modelInfo.targets).map(([target, data]) => (
                <TableRow key={target}>
                  <TableCell className="py-2 font-medium">{target}</TableCell>
                  <TableCell className="py-2 text-[var(--text-muted)]">{data.algorithm}</TableCell>
                  <TableCell className="py-2">{data.threshold}</TableCell>
                  <TableCell className="py-2">{data.validation.brier.toFixed(3)}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={data.calibration_method === "Isotonic" ? "success" : "neutral"}>
                      {data.calibration_method}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardBody>
      <CardFooter className="bg-[var(--surface-muted)] py-3 px-6 text-xs text-[var(--text-muted)] italic">
        {modelInfo.limitations.join(" ")}
      </CardFooter>
    </Card>
  )
}
