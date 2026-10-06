import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/Tabs"
import { Button } from "../../../components/ui/Button"
import type { AnalyzeResponse } from "../../../types/api"
import { assessmentFields } from "../../assessment/featureConfig"

interface ShapViewProps {
  explanations: AnalyzeResponse["explanations"]
}

type TargetKey = "CAD" | "LAD" | "LCX" | "RCA"

export function ShapView({ explanations }: ShapViewProps) {
  const [target, setTarget] = useState<TargetKey>("CAD")
  const [showTable, setShowTable] = useState(false)

  const targets: TargetKey[] = ["CAD", "LAD", "LCX", "RCA"]
  
  const currentExplanation = explanations[target]

  // Prepare data for chart
  const chartData = useMemo(() => {
    if (!currentExplanation) return []
    
    const allContributors = [
      ...currentExplanation.top_increasing_contributors.map(c => ({ ...c, signed_contribution: c.contribution })),
      ...currentExplanation.top_decreasing_contributors.map(c => ({ ...c, signed_contribution: -c.contribution }))
    ]

    // Sort by absolute contribution descending
    allContributors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

    return allContributors.map(c => {
      // Find label from featureConfig if possible
      const configField = assessmentFields.find(f => f.key === c.feature)
      const labelName = configField?.label || c.ui_label || c.feature
      let valueStr = c.raw_value !== null ? String(c.raw_value) : "N/A"
      
      // Attempt to map segmented/select values to their labels
      if (configField?.options && c.raw_value !== null) {
        const opt = configField.options.find(o => o.value === String(c.raw_value))
        if (opt) valueStr = opt.label
      }
      
      // Add unit if applicable
      if (configField?.unit && c.raw_value !== null) {
        valueStr += ` ${configField.unit}`
      }

      return {
        ...c,
        name: `${labelName}: ${valueStr}`,
        shortName: labelName.length > 20 ? labelName.substring(0, 17) + "..." : labelName,
        value: c.signed_contribution,
        ui_label: c.ui_label || c.feature
      }
    })
  }, [currentExplanation])

  const chartHeight = Math.max(300, chartData.length * 45 + 50)
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const isPositive = data.value > 0
      return (
        <div className="bg-white border border-[var(--border)] p-3 rounded-md shadow-md text-sm max-w-xs">
          <p className="font-semibold text-[var(--text)] mb-1">{data.ui_label}</p>
          <p className="text-[var(--text-muted)] text-xs mb-2">Value: {data.raw_value}</p>
          <p className="font-medium flex items-center justify-between">
            <span>Contribution:</span>
            <span className={isPositive ? "text-[var(--risk-high)]" : "text-[var(--protective)]"}>
              {isPositive ? "+" : ""}{data.value.toFixed(4)}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  if (!currentExplanation) return null

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Risk Explainability (SHAP)</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">Top clinical factors driving the model's prediction for each target.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowTable(!showTable)}>
          {showTable ? "Show as Chart" : "Show as Table"}
        </Button>
      </div>

      <div className="p-4 sm:p-6 flex-1">
        <Tabs value={target} onValueChange={(v) => setTarget(v as TargetKey)}>
          <TabsList className="grid grid-cols-4 w-full max-w-md mb-6">
            {targets.map(t => (
              <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={target} className="mt-0">
            {showTable ? (
              <div className="overflow-x-auto border border-[var(--border)] rounded-md">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)] text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3 text-right">Contribution</th>
                      <th className="px-4 py-3">Direction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">No data available</td></tr>
                    ) : (
                      chartData.map((row, i) => (
                        <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)]">
                          <td className="px-4 py-3 font-medium">{row.ui_label}</td>
                          <td className="px-4 py-3 text-[var(--text-muted)]">{row.raw_value ?? "N/A"}</td>
                          <td className={`px-4 py-3 text-right font-medium ${row.value > 0 ? "text-[var(--risk-high)]" : "text-[var(--protective)]"}`}>
                            {row.value > 0 ? "+" : ""}{row.value.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-muted)]">{row.direction === "increases_risk" ? "Increases Risk" : "Decreases Risk"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ height: chartHeight, width: '100%' }}>
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                    No explanation data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      barSize={20}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={180} 
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(val) => val.length > 25 ? val.substring(0, 22) + "..." : val}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
                      <ReferenceLine x={0} stroke="var(--border)" strokeWidth={2} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value > 0 ? 'var(--risk-high)' : 'var(--protective)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {chartData.length > 0 && currentExplanation.top_decreasing_contributors.length === 0 && (
              <p className="text-center text-sm text-[var(--text-muted)] mt-4 italic">
                No protective factors among the top contributors.
              </p>
            )}

            <div className="mt-8 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] leading-relaxed">
              <p className="mb-2"><strong>Scope:</strong> {currentExplanation.explanation_scope}</p>
              <p>Values represent SHAP (SHapley Additive exPlanations) values. Positive values drive the model toward a positive prediction, while negative values push toward a negative prediction.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
