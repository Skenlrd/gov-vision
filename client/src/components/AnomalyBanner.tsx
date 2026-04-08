import type { IAnomaly, IAnomalyGroup } from "../types"
import { acknowledgeAnomaly } from "../services/api"

interface AnomalyBannerProps {
  anomalies: IAnomalyGroup
  onAcknowledge: (id: string) => void
}

const severityColors: Record<string, string> = {
  Critical: "#B91C1C",
  High: "#C2410C",
  Medium: "#A16207",
  Low: "#1D4ED8"
}

const panelColors: Record<string, string> = {
  Critical: "#FEF2F2",
  High: "#FFF7ED",
  Medium: "#FFFBEB",
  Low: "#EFF6FF"
}

export default function AnomalyBanner({ anomalies, onAcknowledge }: AnomalyBannerProps) {
  const allAnomalies: IAnomaly[] = [
    ...anomalies.Critical,
    ...anomalies.High,
    ...anomalies.Medium,
    ...anomalies.Low
  ]

  if (allAnomalies.length === 0) return null

  async function handleAcknowledge(anomaly: IAnomaly) {
    try {
      await acknowledgeAnomaly(anomaly._id)
      onAcknowledge(anomaly._id)
    } catch (err) {
      console.error("Acknowledge failed:", err)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <h3
        style={{
          margin: 0,
          fontSize: "12px",
          fontWeight: 700,
          color: "#64748B",
          letterSpacing: "0.5px",
          textTransform: "uppercase"
        }}
      >
        Active Anomalies ({allAnomalies.length})
      </h3>

      {allAnomalies.slice(0, 5).map((anomaly) => {
        const color = severityColors[anomaly.severity] ?? "#475569"
        const bg = panelColors[anomaly.severity] ?? "#F8FAFC"

        return (
          <div
            key={anomaly._id}
            style={{
              borderLeft: `4px solid ${color}`,
              borderRadius: "10px",
              padding: "12px 14px",
              background: bg,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px"
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "#FFFFFF",
                    color
                  }}
                >
                  {anomaly.severity}
                </span>
                <span style={{ fontSize: "11px", color: "#64748B" }}>
                  Decision: {anomaly.decisionId ?? "n/a"} | {anomaly.department}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: "13px", color: "#334155" }}>
                {anomaly.description}
              </p>

              <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#94A3B8" }}>
                Score: {anomaly.anomalyScore.toFixed(3)} | Cycle: {anomaly.featureValues?.cycleTimeHours ?? 0}h | Rejections: {anomaly.featureValues?.rejectionCount ?? 0}
              </p>
            </div>

            <button
              onClick={() => handleAcknowledge(anomaly)}
              style={{
                marginLeft: "6px",
                fontSize: "11px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                background: "white",
                color: "#334155",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Acknowledge
            </button>
          </div>
        )
      })}

      {allAnomalies.length > 5 && (
        <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8" }}>
          +{allAnomalies.length - 5} more - view all in AI Insights
        </p>
      )}
    </div>
  )
}
