import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Scatter, ComposedChart, Cell } from "recharts"
import { RiskBadge } from "../../dashboard/components/RiskBadge"
import type { AnalyzeResponse } from "../../../types/api"

interface RiskOverviewProps {
  predictions: AnalyzeResponse["predictions"]
}

export function RiskOverview({ predictions }: RiskOverviewProps) {
  const cadData = predictions.CAD
  const cadPercent = (cadData.probability * 100).toFixed(1)
  const cadThreshold = (cadData.threshold * 100).toFixed(1)
  
  // Data for the compact bar chart
  const chartData = [
    { name: "CAD", prob: cadData.probability * 100, threshold: cadData.threshold * 100 },
    { name: "LAD", prob: predictions.LAD.probability * 100, threshold: predictions.LAD.threshold * 100 },
    { name: "LCX", prob: predictions.LCX.probability * 100, threshold: predictions.LCX.threshold * 100 },
    { name: "RCA", prob: predictions.RCA.probability * 100, threshold: predictions.RCA.threshold * 100 }
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-[var(--border)] p-2 rounded shadow-sm text-xs">
          <p className="font-bold">{data.name}</p>
          <p>Risk: <span className="font-semibold text-[var(--danger)]">{data.prob.toFixed(1)}%</span></p>
          <p>Threshold: {data.threshold.toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[var(--surface)] p-6 rounded-[var(--radius-card)] border border-[var(--border)] shadow-sm">
      
      {/* CAD Gauge */}
      <div className="lg:col-span-5 flex items-center gap-6">
        <div className="relative w-32 h-20 shrink-0 flex flex-col items-center justify-end overflow-hidden">
          <svg className="w-full h-auto overflow-visible" viewBox="0 0 100 50">
            {/* Background arc */}
            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--surface-muted)" strokeWidth="12" strokeLinecap="round" />
            
            {/* Value arc */}
            <path 
              d="M 10 50 A 40 40 0 0 1 90 50" 
              fill="none" 
              stroke={cadData.positive ? "var(--danger)" : "var(--primary)"} 
              strokeWidth="12" 
              strokeLinecap="round"
              strokeDasharray="125.6" // pi * r (r=40)
              strokeDashoffset={125.6 - (125.6 * cadData.probability)} 
              className="transition-all duration-1000 ease-out"
            />
            
            {/* Threshold marker */}
            <line 
              x1="50" y1="50" 
              x2={50 + 48 * Math.cos(Math.PI - (Math.PI * cadData.threshold))} 
              y2={50 - 48 * Math.sin(Math.PI - (Math.PI * cadData.threshold))} 
              stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="2 2"
            />
          </svg>
          <div className="absolute bottom-0 text-2xl font-bold text-[var(--text)]">
            {cadPercent}<span className="text-sm font-medium text-[var(--text-muted)] ml-0.5">%</span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-[var(--text)] text-lg">Systemic CAD Risk</h3>
            <RiskBadge band={cadData.visualization_band} />
          </div>
          <p className="text-sm font-medium text-[var(--text-muted)]">
            {cadData.positive ? 'Above' : 'Below'} the model threshold ({cadThreshold}%)
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Predicted systemic CAD risk based on clinical features.
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-1 border-r border-[var(--border)] mx-auto h-full" />

      {/* Mini Risk vs Threshold Chart */}
      <div className="lg:col-span-6 flex flex-col justify-center">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Risk vs Threshold Overview</h4>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="name" width={40} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text)', fontWeight: 600 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
              <Bar dataKey="prob" barSize={12} radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.prob >= entry.threshold ? 'var(--danger)' : 'var(--primary)'} />
                ))}
              </Bar>
              <Scatter dataKey="threshold" fill="var(--text-muted)" shape="wye" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
