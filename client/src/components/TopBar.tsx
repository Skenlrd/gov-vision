import { useCallback, useEffect, useState } from "react"
import { getKpiSummary } from "../services/api"

interface TopBarProps {
  anomalyCount?: number
  openViolations?: number
}

export default function TopBar({ anomalyCount = 0, openViolations = 0 }: TopBarProps) {
  const alertCount = anomalyCount + openViolations
  const [isLive, setIsLive] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const formatTime = (value: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }).format(value)
  }

  const checkLiveStatus = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      await getKpiSummary({ dateFrom: today, dateTo: today, deptId: null })
      setIsLive(true)
      setLastUpdated(new Date())
    } catch {
      setIsLive(false)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    checkLiveStatus()
    const intervalId = window.setInterval(() => {
      checkLiveStatus()
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [checkLiveStatus])

  const statusLabel = isLive ? "Live" : "Service unavailable"
  const statusColor = isLive ? "#0F766E" : "#B91C1C"
  const dotColor = isLive ? "#10B981" : "#EF4444"
  const updatedLabel = isLive
    ? (isRefreshing ? "Checking now..." : (lastUpdated ? `Updated ${formatTime(lastUpdated)}` : "Checking now..."))
    : "Not Available"

  return (
    <header style={{
      height: "64px",
      background: "white",
      borderBottom: "1px solid #E8EDF5",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      position: "sticky",
      top: 0,
      zIndex: 40,
      boxShadow: "0 1px 8px rgba(0,0,0,0.04)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: dotColor,
            alignSelf: "center",
            marginTop: "-1px"
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", alignItems: "flex-start" }}>
          <span
            style={{
              fontSize: "12px",
              color: statusColor,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.1
            }}
          >
            {statusLabel}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "#64748B",
              fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.1
            }}
          >
            {updatedLabel}
          </span>
        </div>
        <button
          type="button"
          aria-label="Refresh"
          title="Refresh"
          onClick={() => window.location.reload()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            padding: "0",
            borderRadius: "999px",
            border: "1px solid #CBD5E1",
            background: "#FFFFFF",
            color: "#334155",
            cursor: isRefreshing ? "wait" : "pointer",
            opacity: isRefreshing ? 0.75 : 1,
            alignSelf: "center"
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="12" height="12" style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }}>
            <path d="M4 4v6h6" />
            <path d="M20 20v-6h-6" />
            <path d="M5.64 18.36A9 9 0 0 0 20 12" />
            <path d="M18.36 5.64A9 9 0 0 0 4 12" />
          </svg>
        </button>
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Notification bell */}
        <button style={{
          width: "38px", height: "38px",
          borderRadius: "10px",
          background: "#F4F7FF",
          border: "1px solid #E2E8F4",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2} width="17" height="17">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {alertCount > 0 && (
            <span style={{
              position: "absolute",
              top: "6px", right: "6px",
              width: "8px", height: "8px",
              borderRadius: "50%",
              background: "#EF4444",
              border: "1.5px solid white"
            }} />
          )}
        </button>

        {/* Divider */}
        <div style={{ width: "1px", height: "24px", background: "#E2E8F4", margin: "0 4px" }} />

        {/* Role Switcher Dropdown */}
        <div style={{ position: "relative" }} className="role-switcher">
          <select
            value={localStorage.getItem("x_test_role") || "analyst"}
            onChange={(e) => {
              localStorage.setItem("x_test_role", e.target.value)
              window.location.reload()
            }}
            style={{
              height: "36px",
              padding: "0 12px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #3A3F48, #2A2F36)",
              color: "white",
              fontSize: "11px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              border: "1px solid rgba(255,255,255,0.1)",
              appearance: "none",
              outline: "none",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              boxShadow: "0 2px 8px rgba(15,23,42,0.22)",
              textAlign: "center",
              minWidth: "100px"
            }}
          >
            <option value="admin" style={{ color: "#1F2937", background: "white" }}>ADMIN</option>
            <option value="manager" style={{ color: "#1F2937", background: "white" }}>MANAGER</option>
            <option value="executive" style={{ color: "#1F2937", background: "white" }}>EXECUTIVE</option>
            <option value="analyst" style={{ color: "#1F2937", background: "white" }}>ANALYST</option>
          </select>
          <div style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "rgba(255,255,255,0.5)",
            fontSize: "10px"
          }}>
            ▼
          </div>
        </div>
      </div>
    </header>
  )
}
