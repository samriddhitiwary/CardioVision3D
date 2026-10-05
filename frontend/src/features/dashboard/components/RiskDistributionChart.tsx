import { Card, CardBody, CardHeader, CardTitle } from "../../../components/ui/Card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface RiskDistributionChartProps {
  bandCounts: { Low: number; Moderate: number; High: number }
  notAssessed: number
}

const COLORS = {
  High: "var(--danger)",
  Moderate: "var(--warning)",
  Low: "var(--success)",
  "Not assessed": "var(--text-muted)",
}

export function RiskDistributionChart({ bandCounts, notAssessed }: RiskDistributionChartProps) {
  const data = [
    { name: "High", value: bandCounts.High },
    { name: "Moderate", value: bandCounts.Moderate },
    { name: "Low", value: bandCounts.Low },
    { name: "Not assessed", value: notAssessed },
  ].filter(d => d.value > 0)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Risk Distribution</CardTitle>
      </CardHeader>
      <CardBody className="flex-1 min-h-[300px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-muted)]">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart aria-label="Risk Distribution Chart">
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text)", borderRadius: "6px" }}
                itemStyle={{ color: "var(--text)" }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => (
                  <span className="text-[var(--text)] ml-1">
                    {value} ({entry.payload.value})
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  )
}
