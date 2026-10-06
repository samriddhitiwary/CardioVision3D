import { Card, CardBody, CardHeader, CardTitle } from "../../../components/ui/Card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface HighestVesselChartProps {
  byHighestVessel: { LAD: number; LCX: number; RCA: number }
}

export function HighestVesselChart({ byHighestVessel }: HighestVesselChartProps) {
  const data = [
    { name: "LAD", value: byHighestVessel.LAD },
    { name: "LCX", value: byHighestVessel.LCX },
    { name: "RCA", value: byHighestVessel.RCA },
  ]

  return (
    <Card className="h-full flex flex-col mt-6 md:mt-0">
      <CardHeader>
        <CardTitle className="text-lg">Highest-Risk Vessel</CardTitle>
      </CardHeader>
      <CardBody className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} aria-label="Highest Risk Vessel Chart">
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text)' }} width={50} />
            <Tooltip 
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px", borderRadius: "6px" }}>
                      <p className="text-sm font-medium">{`${payload[0].payload.name}: ${payload[0].value}`}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} activeBar={false}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill="var(--primary)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  )
}
