import { useEffect, useMemo, useRef, useState } from "react"
import { acknowledgeAnomaly, getAnomalyGroups } from "../services/api"
import type {
  IAnomaly,
  IAnomalyGroup,
  IFeatureImportance,
  IFeatureValues
} from "../types"
import AnomalyTableRow from "../components/AnomalyTableRow"
import FeatureImportanceChart from "../components/FeatureImportanceChart"

const INITIAL_GROUPS: IAnomalyGroup = {
  Critical: [],
  High: [],
  Medium: [],
  Low: [],
  total: 0
}

const severityOptions = ["All", "Critical", "High", "Medium", "Low"]

const DEPARTMENT_LABELS: Record<string, string> = {
  FI001: "Finance",
  finance: "Finance",
  Finance: "Finance",
  HR001: "Human Resources",
  HR002: "Human Resources",
  "human resources": "Human Resources",
  OPS001: "Operations",
  OP003: "Operations",
  operations: "Operations",
  IT001: "Information Technology",
  IT004: "Information Technology",
  "information technology": "Information Technology",
  CS005: "Customer Service",
  "customer service": "Customer Service",
  LEGAL001: "Legal",
  legal: "Legal"
}

function getDepartmentLabel(value: string): string {
  if (!value) return "Unknown"
  return DEPARTMENT_LABELS[value] || DEPARTMENT_LABELS[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1)
}

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

function StatCard({
  label,
  value,
  sub,
  subColor,
  accentColor,
  accentBg,
  accentBorder
}: {
  label: string
  value: number
  sub: string
  subColor: string
  accentColor?: string
  accentBg?: string
  accentBorder?: string
}) {
  return (
    <div
      style={{
        background: accentBg ?? "#fff",
        border: `1px solid ${accentBorder ?? "#E6EBF2"}`,
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 4
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accentColor ?? "#94A3B8"
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: accentColor ?? "#0F172A",
          lineHeight: 1.1,
          letterSpacing: "-0.5px"
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 11, color: subColor, fontWeight: 500, marginTop: 2 }}>{sub}</span>
    </div>
  )
}

type DropdownOption = {
  label: string
  value: string
}

function AccentDropdown({
  value,
  options,
  onChange,
  width = "190px"
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", onMouseDown)
    return () => window.removeEventListener("mousedown", onMouseDown)
  }, [])

  const selected = options.find(option => option.value === value) ?? options[0]

  return (
    <div ref={rootRef} style={{ position: "relative", width }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "9px",
          border: open ? "1px solid var(--accent-600)" : "1px solid #E2E8F0",
          background: "white",
          fontSize: "13px",
          fontWeight: 500,
          color: "#334155",
          fontFamily: "inherit",
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: open ? "0 0 0 3px var(--accent-ring)" : "none"
        }}
      >
        <span>{selected?.label}</span>
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "#6B7280", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid var(--accent-300)",
            borderRadius: "10px",
            boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
            padding: "5px",
            zIndex: 60
          }}
        >
          {options.map(option => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: "100%",
                  border: "none",
                  background: isSelected ? "#E5E7EB" : "transparent",
                  color: isSelected ? "#111827" : "#334155",
                  borderRadius: "7px",
                  textAlign: "left",
                  padding: "7px 10px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "background 0.15s ease,color 0.15s ease"
                }}
                onMouseEnter={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "#F3F4F6"
                  event.currentTarget.style.color = "#1F2937"
                }}
                onMouseLeave={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "transparent"
                  event.currentTarget.style.color = "#334155"
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
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
    return ["All", ...values.map(value => getDepartmentLabel(value))]
  }, [allAnomalies])

  const filtered = useMemo(() => {
    return allAnomalies.filter(anomaly => {
      const severityMatch = severityFilter === "All" || anomaly.severity === severityFilter
      const deptMatch =
        deptFilter === "All" || getDepartmentLabel(anomaly.department) === deptFilter
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

  const severityDropdownOptions = severityOptions.map(opt => ({
    label: opt === "All" ? "All severities" : opt,
    value: opt
  }))

  const departmentDropdownOptions = departmentOptions.map(opt => ({
    label: opt === "All" ? "All departments" : opt,
    value: opt
  }))

  const tableHeaders = [
    "Date",
    "Decision ID",
    "Department",
    "Severity",
    "Score",
    "Cycle Time",
    "Rejections",
    "Status",
    "Action"
  ]

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
        fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main style={{ padding: "28px 28px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Breadcrumb + Title */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10
              }}
            >
              <span style={{ fontSize: 12, color: "#94A3B8" }}>Home</span>
              <span style={{ color: "#CBD5E1", fontSize: 12 }}>›</span>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Anomaly Detection</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#0F172A",
                    letterSpacing: "-0.6px"
                  }}
                >
                  Anomaly Detection
                </h1>
                <p style={{ margin: "5px 0 0", fontSize: 13, color: "#64748B" }}>
                  Detailed anomaly investigation with severity and department filtering.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "1px solid #E6EBF2",
                  borderRadius: 10,
                  padding: "8px 14px",
                  flexShrink: 0
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22C55E",
                    boxShadow: "0 0 0 3px rgba(34,197,94,0.2)",
                    display: "inline-block"
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>Live</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#B91C1C",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <span style={{ fontSize: 16 }}>⚠</span>
              {error}
            </div>
          )}

          {/* Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12
            }}
          >
            <StatCard
              label="Total Anomalies"
              value={anomalyData.total}
              sub="Across all departments"
              subColor="#94A3B8"
              accentBg="#fff"
              accentBorder="#E6EBF2"
            />
            <StatCard
              label="Critical"
              value={anomalyData.Critical.length}
              sub="Needs immediate action"
              subColor="#F87171"
              accentColor="#B91C1C"
              accentBg="#FFF5F5"
              accentBorder="#FECACA"
            />
            <StatCard
              label="High"
              value={anomalyData.High.length}
              sub="Review within 24h"
              subColor="#FB923C"
              accentColor="#C2410C"
              accentBg="#FFF8F0"
              accentBorder="#FED7AA"
            />
            <StatCard
              label="Medium / Low"
              value={anomalyData.Medium.length + anomalyData.Low.length}
              sub="Monitor & schedule"
              subColor="#4ADE80"
              accentColor="#15803D"
              accentBg="#F0FDF4"
              accentBorder="#BBF7D0"
            />
          </div>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              background: "#fff",
              border: "1px solid #E6EBF2",
              borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              padding: "12px 16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginRight: 2 }}>
                Filter by
              </span>
              <AccentDropdown
                value={severityFilter}
                options={severityDropdownOptions}
                onChange={setSeverityFilter}
              />
              <AccentDropdown
                value={deptFilter}
                options={departmentDropdownOptions}
                onChange={setDeptFilter}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
                Showing{" "}
                <strong style={{ color: "#0F172A" }}>{filtered.length}</strong> of{" "}
                {allAnomalies.length} anomalies
              </span>
              {(severityFilter !== "All" || deptFilter !== "All") && (
                <button
                  onClick={() => {
                    setSeverityFilter("All")
                    setDeptFilter("All")
                  }}
                  style={{
                    border: "1px solid #E2E8F0",
                    background: "transparent",
                    color: "#64748B",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ display: "grid", gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    background: "linear-gradient(90deg, #E2E8F0 25%, #EEF2F7 50%, #E2E8F0 75%)",
                    backgroundSize: "400% 100%",
                    animation: "shimmer 1.4s infinite"
                  }}
                />
              ))}
              <style>{`@keyframes shimmer { 0% { background-position: 100% 50% } 100% { background-position: 0% 50% } }`}</style>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E6EBF2",
                borderRadius: 14,
                boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                overflow: "hidden"
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 980
                  }}
                >
                  <thead>
                    <tr style={{ background: "#FAFBFC" }}>
                      {tableHeaders.map(header => (
                        <th
                          key={header}
                          style={{
                            textAlign: "left",
                            padding: "11px 14px",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#94A3B8",
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            borderBottom: "1px solid #F1F5F9",
                            whiteSpace: "nowrap"
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
              </div>

              {filtered.length === 0 && (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "#F8FAFC",
                      border: "1px solid #E6EBF2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      marginBottom: 4
                    }}
                  >
                    🔍
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                    No anomalies found
                  </span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    Try adjusting your filters to see more results.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Feature Importance Chart */}
          <FeatureImportanceChart data={featureImportance} />
        </main>
      </div>
    </div>
  )
}