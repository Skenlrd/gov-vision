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

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff"]

export default function FeatureImportanceChart({ data }: Props) {
  if (data.length === 0) {
    return null
  }

  const chartData = data.map(d => ({
    name: featureLabels[d.feature] || d.feature,
    percentage: d.weight
  }))

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E6EBF2",
        padding: "18px",
      }}
    >
      <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 700, color: "#1F2937" }}>
        Feature Contribution to Anomalies (approximate)
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {chartData.map((feature, index) => (
          <div key={feature.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#4B5563" }}>
              <span>{feature.name}</span>
              <span style={{ fontFamily: "monospace" }}>{feature.percentage}%</span>
            </div>
            <div style={{ height: "10px", background: "#F3F4F6", borderRadius: "9999px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: "9999px",
                  transition: "all 0.3s ease",
                  width: `${feature.percentage}%`,
                  backgroundColor: BAR_COLORS[index % BAR_COLORS.length]
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
