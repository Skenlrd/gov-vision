import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts"
import type { IFeatureImportance } from "../types"

interface Props {
  data: IFeatureImportance[]
}

const featureLabels: Record<string, string> = {
  cycleTimeHours: "Cycle Time",
  rejectionCount: "Rejections",
  revisionCount: "Revisions",
  daysOverSLA: "Days Over SLA",
  stageCount: "Stage Count",
  hourOfDaySubmitted: "Submission Hour"
}

const barColors = ["#B0895A", "#9A744A", "#C39A6D", "#7E6648", "#D8B48A", "#674C31"]

export default function FeatureImportanceChart({ data }: Props) {
  if (data.length === 0) {
    return null
  }

  const chartData = data.map(d => ({
    name: featureLabels[d.feature] || d.feature,
    weight: d.weight
  }))

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E6EBF2",
        padding: "18px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: "#5F452B" }}>
        Feature Contribution to Anomalies (approximate)
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart layout="vertical" data={chartData} margin={{ left: 8, right: 32 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={112} />
          <Tooltip />
          <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={barColors[i % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
