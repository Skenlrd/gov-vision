import { useEffect, useMemo, useState } from "react"
import axios from "axios"

const apiHost = window.location.hostname || "localhost"
const apiProtocol = window.location.protocol
const apiPort = import.meta.env.VITE_API_PORT || "5002"
const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || `${apiProtocol}//${apiHost}:${apiPort}`

interface IFeedAnomaly {
  _id: string
  anomalyScore: number
  severity: string
  isAcknowledged: boolean
  department: string
  decisionId: string
  description: string
  detectedAt?: string
}

interface AnomalyFeedProps {
  anomalies?: IFeedAnomaly[]
  onAcknowledge?: (id: string) => void
}

const severityConfig: Record<string, {
  dot: string
  bg: string
  border: string
  label: string
  labelColor: string
}> = {
  Critical: { dot: "#EF4444", bg: "#FFF5F5", border: "#FED7D7", label: "CRITICAL", labelColor: "#EF4444" },
  High:     { dot: "#F97316", bg: "#FFF7ED", border: "#FED7AA", label: "HIGH",     labelColor: "#F97316" },
  Medium:   { dot: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", label: "MEDIUM",   labelColor: "#D97706" },
  Low:      { dot: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE", label: "LOW",      labelColor: "#3B82F6" },
  Normal:   { dot: "#10B981", bg: "#F0FDF4", border: "#BBF7D0", label: "NORMAL",   labelColor: "#10B981" }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AnomalyFeed({ anomalies, onAcknowledge }: AnomalyFeedProps) {
  const [feedAnomalies, setFeedAnomalies] = useState<IFeedAnomaly[]>(anomalies ?? [])

  useEffect(() => {
    if (anomalies) {
      setFeedAnomalies(anomalies)
    }
  }, [anomalies])

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await axios.get(`${apiBaseUrl}/api/ai/anomalies`, {
          headers: {
            Authorization: `Bearer ${token ?? ""}`
          }
        })

        const data = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? [])

        setFeedAnomalies(data)
      } catch (error) {
        console.error("Failed to fetch anomalies:", error)
      }
    }

    fetchAnomalies()
  }, [])

  const sorted = useMemo(() => [...feedAnomalies].sort((a, b) =>
    new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  ), [feedAnomalies])

  const handleAcknowledge = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      await axios.put(
        `${apiBaseUrl}/api/ai/anomalies/${id}/acknowledge`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token ?? ""}`
          }
        }
      )

      setFeedAnomalies((prev) => prev.filter((a) => a._id !== id))
      onAcknowledge?.(id)
    } catch (error) {
      console.error("Failed to acknowledge anomaly:", error)
    }
  }

  return (
    <div style={{
      background: "white",
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 18px",
        borderBottom: "1px solid #F1F5F9",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "8px", height: "8px",
            borderRadius: "50%",
            background: "#EF4444",
            animation: "livePulse 1.5s infinite",
            display: "inline-block"
          }} />
          <span style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#1E293B",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            fontFamily: "'Outfit', sans-serif"
          }}>
            Real-Time Anomalies
          </span>
        </div>
        {feedAnomalies.length > 0 && (
          <span style={{
            background: "#EF4444",
            color: "white",
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "20px",
            fontFamily: "'Outfit', sans-serif"
          }}>
            {feedAnomalies.length} Active
          </span>
        )}
      </div>

      {/* Feed */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        {sorted.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "160px",
            gap: "8px"
          }}>
            <div style={{
              width: "44px", height: "44px",
              background: "#F0FDF4",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2} width="22" height="22">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Outfit', sans-serif" }}>
              All clear — no active anomalies
            </p>
          </div>
        ) : (
          sorted.map(anomaly => {
            const cfg = severityConfig[anomaly.severity] ?? severityConfig.Normal
            return (
              <div
                key={anomaly._id}
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: "10px",
                  padding: "12px 12px 10px"
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      width: "7px", height: "7px",
                      borderRadius: "50%",
                      background: cfg.dot,
                      flexShrink: 0,
                      display: "inline-block"
                    }} />
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: cfg.labelColor,
                      letterSpacing: "0.5px",
                      fontFamily: "'Outfit', sans-serif"
                    }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "'Outfit', sans-serif" }}>
                      Score: {anomaly.anomalyScore.toFixed(3)}
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", color: "#94A3B8", fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
                    {timeAgo(anomaly.detectedAt ?? new Date().toISOString())}
                  </span>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: "12.5px",
                  color: "#374151",
                  marginBottom: "8px",
                  lineHeight: "1.45",
                  fontFamily: "'Outfit', sans-serif"
                }}>
                  {anomaly.description}
                </p>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: "11px",
                    color: "#94A3B8",
                    background: "rgba(0,0,0,0.05)",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontFamily: "'Outfit', sans-serif"
                  }}>
                    {anomaly.department}
                  </span>
                  <button
                    onClick={() => handleAcknowledge(anomaly._id)}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: cfg.labelColor,
                      background: "white",
                      border: `1px solid ${cfg.border}`,
                      padding: "3px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontFamily: "'Outfit', sans-serif",
                      transition: "opacity 0.2s"
                    }}
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {feedAnomalies.length > 0 && (
        <div style={{
          padding: "12px 18px",
          borderTop: "1px solid #F1F5F9",
          textAlign: "center"
        }}>
          <button style={{
            fontSize: "12px",
            color: "#3B82F6",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontFamily: "'Outfit', sans-serif"
          }}>
            View All Alerts History →
          </button>
        </div>
      )}
    </div>
  )
}
