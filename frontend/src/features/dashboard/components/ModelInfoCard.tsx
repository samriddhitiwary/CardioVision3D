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
            <Badge variant="neutral">v{modelInfo.version}</Badge>
            <Badge variant="neutral">{modelInfo.features} Features</Badge>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-1">Trained on {modelInfo.dataset}</p>
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
              {modelInfo.performance.map((perf) => (
                <TableRow key={perf.target}>
                  <TableCell className="py-2 font-medium">{perf.target}</TableCell>
                  <TableCell className="py-2 text-[var(--text-muted)]">{perf.algorithm}</TableCell>
                  <TableCell className="py-2">{perf.threshold}</TableCell>
                  <TableCell className="py-2">{perf.brier.toFixed(3)}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={perf.calibration === "Isotonic" ? "success" : "neutral"}>
                      {perf.calibration}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardBody>
      <CardFooter className="bg-[var(--surface-muted)] py-3 px-6 text-xs text-[var(--text-muted)] italic">
        {modelInfo.disclaimer}
      </CardFooter>
    </Card>
  )
}
