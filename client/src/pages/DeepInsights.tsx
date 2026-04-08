import { useEffect, useMemo, useState } from "react"
import { acknowledgeAnomaly, getAnomalyGroups } from "../services/api"
import type {
  IAnomaly,
  IAnomalyGroup,
  IFeatureImportance,
  IFeatureValues
} from "../types"
import AnomalyTableRow from "../components/AnomalyTableRow"
import FeatureImportanceChart from "../components/FeatureImportanceChart"
import TopBar from "../components/TopBar"

const INITIAL_GROUPS: IAnomalyGroup = {
  Critical: [],
  High: [],
  Medium: [],
  Low: [],
  total: 0
}

const severityOptions = ["All", "Critical", "High", "Medium", "Low"]

function flattenGroups(groups: IAnomalyGroup): IAnomaly[] {
  return [
    ...groups.Critical,
    ...groups.High,
    ...groups.Medium,
    ...groups.Low
  ]
}

function computeFeatureImportance(anomalies: IAnomaly[]): IFeatureImportance[] {
  if (anomalies.length === 0) return []

  const features: (keyof IFeatureValues)[] = [
    "cycleTimeHours",
    "rejectionCount",
    "revisionCount",
    "daysOverSLA",
    "stageCount",
    "hourOfDaySubmitted"
  ]

  const averages = features.map(feature => ({
    feature,
    avg:
      anomalies.reduce((sum, anomaly) => {
        const value = anomaly.featureValues?.[feature] ?? 0
        return sum + value
      }, 0) / anomalies.length
  }))

  const total = averages.reduce((sum, item) => sum + item.avg, 0) || 1

  return averages
    .map(({ feature, avg }) => ({
      feature,
      weight: Number(((avg / total) * 100).toFixed(1))
    }))
    .sort((a, b) => b.weight - a.weight)
}

export default function DeepInsights() {
  const [anomalyData, setAnomalyData] = useState<IAnomalyGroup>(INITIAL_GROUPS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState("All")
  const [deptFilter, setDeptFilter] = useState("All")

  useEffect(() => {
    setLoading(true)
    setError(null)

    getAnomalyGroups()
      .then(data => {
        setAnomalyData(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load anomaly data.")
        setLoading(false)
      })
  }, [])

  const allAnomalies = useMemo(() => flattenGroups(anomalyData), [anomalyData])

  const departmentOptions = useMemo(() => {
    const values = Array.from(new Set(allAnomalies.map(a => a.department))).sort()
    return ["All", ...values]
  }, [allAnomalies])

  const filtered = useMemo(() => {
    return allAnomalies.filter(anomaly => {
      const severityMatch = severityFilter === "All" || anomaly.severity === severityFilter
      const deptMatch = deptFilter === "All" || anomaly.department === deptFilter
      return severityMatch && deptMatch
    })
  }, [allAnomalies, severityFilter, deptFilter])

  const featureImportance = useMemo(
    () => computeFeatureImportance(allAnomalies),
    [allAnomalies]
  )

  async function handleAcknowledge(id: string) {
    await acknowledgeAnomaly(id)
    setAnomalyData(prev => ({
      ...prev,
      Critical: prev.Critical.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a)),
      High: prev.High.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a)),
      Medium: prev.Medium.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a)),
      Low: prev.Low.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a))
    }))
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar isLive={true} anomalyCount={anomalyData.total} openViolations={0} />

        <main style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ marginBottom: "4px" }}>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Home</span><span style={{ color: "#CBD5E1" }}>›</span>
            <span>Deep Insights</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#0F172A", letterSpacing: "-0.4px" }}>Deep Insights</h1>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#64748B" }}>
            Detailed anomaly investigation with severity and department filtering.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #FECACA",
              background: "#FEF2F2",
              color: "#B91C1C",
              fontSize: "12px",
              fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            background: "white",
            border: "1px solid #E6EBF2",
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            padding: "12px"
          }}
        >
          {[
            { label: "Total", value: anomalyData.total, bg: "#ECECEC", color: "#374151" },
            { label: "Critical", value: anomalyData.Critical.length, bg: "#FEE2E2", color: "#991B1B" },
            { label: "High", value: anomalyData.High.length, bg: "#FBE8D6", color: "#8A4B10" },
            { label: "Medium", value: anomalyData.Medium.length, bg: "#F5E8D7", color: "#7A5330" }
          ].map(item => (
            <div
              key={item.label}
              style={{
                borderRadius: "999px",
                padding: "7px 12px",
                fontSize: "12px",
                fontWeight: 700,
                background: item.bg,
                color: item.color
              }}
            >
              {item.label}: {item.value}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            background: "white",
            border: "1px solid #E6EBF2",
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            padding: "12px"
          }}
        >
          <select
            value={severityFilter}
            onChange={event => setSeverityFilter(event.target.value)}
            style={{
              border: "1px solid #D6C7AF",
              borderRadius: "8px",
              padding: "8px 10px",
              fontSize: "12px",
              background: "#FFFDF8",
              color: "#5E4529",
              fontWeight: 600
            }}
          >
            {severityOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            value={deptFilter}
            onChange={event => setDeptFilter(event.target.value)}
            style={{
              border: "1px solid #D6C7AF",
              borderRadius: "8px",
              padding: "8px 10px",
              fontSize: "12px",
              background: "#FFFDF8",
              color: "#5E4529",
              fontWeight: 600
            }}
          >
            {departmentOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: "8px", marginBottom: "20px" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: "40px", borderRadius: "8px", background: "#E2E8F0" }} />
            ))}
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              borderRadius: "12px",
              border: "1px solid #E6EBF2",
              background: "white",
              marginBottom: "6px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
              <thead style={{ background: "#F8F2E9" }}>
                <tr>
                  {["Date", "Decision ID", "Department", "Severity", "Score", "Cycle Time", "Rejections", "Status", "Action"].map(header => (
                    <th
                      key={header}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        fontSize: "11px",
                        color: "#8B6A44",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em"
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(anomaly => (
                  <AnomalyTableRow
                    key={anomaly._id}
                    anomaly={anomaly}
                    onAcknowledge={handleAcknowledge}
                  />
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "18px", color: "#94A3B8", fontSize: "12px" }}>
                No anomalies match the current filters.
              </div>
            )}
          </div>
        )}

        <FeatureImportanceChart data={featureImportance} />
        </main>
      </div>
    </div>
  )
}
