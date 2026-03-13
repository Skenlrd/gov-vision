import { useEffect, useState, useRef } from "react"

interface KPICardProps {
  title: string
  value: number | string
  previousValue?: number
  unit?: string
  icon: React.ReactNode
  accentColor: string
  bgGradient: string
  isBadge?: boolean
  isLive?: boolean
  invertTrend?: boolean   // true = up is bad (violations, anomalies)
}

export default function KPICard({
  title,
  value,
  previousValue,
  unit,
  icon,
  accentColor,
  bgGradient,
  isBadge = false,
  isLive = false,
  invertTrend = false
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState<number>(0)
  const prevRef = useRef<number>(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isBadge || typeof value === "string") return
    const target = value as number
    const start  = prevRef.current
    const diff   = target - start
    const steps  = 60
    let cur = 0

    const iv = setInterval(() => {
      cur++
      const ease = 1 - Math.pow(1 - cur / steps, 3)
      setDisplayValue(Math.round(start + diff * ease))
      if (cur >= steps) {
        clearInterval(iv)
        setDisplayValue(target)
        prevRef.current = target
      }
    }, 14)

    return () => clearInterval(iv)
  }, [value, isBadge])

  const showTrend = previousValue !== undefined && typeof value === "number" && previousValue > 0
  const pct       = showTrend ? Math.abs(Math.round(((value as number) - previousValue!) / previousValue! * 100)) : 0
  const isUp      = showTrend && (value as number) >= previousValue!
  const isGood    = invertTrend ? !isUp : isUp

  // Badge color map
  const riskColors: Record<string, { bg: string; text: string }> = {
    low:      { bg: "#D1FAE5", text: "#065F46" },
    medium:   { bg: "#FEF3C7", text: "#92400E" },
    high:     { bg: "#FEE2E2", text: "#991B1B" },
    critical: { bg: "#FEE2E2", text: "#7F1D1D" }
  }
  const riskKey    = typeof value === "string" ? value.toLowerCase() : "low"
  const badgeStyle = riskColors[riskKey] ?? riskColors.low

  return (
    <div style={{
      background: "white",
      borderRadius: "14px",
      padding: "18px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
      position: "relative",
      overflow: "hidden",
      cursor: "default"
    }}>
      {/* Top gradient bar */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: "3px",
        background: bgGradient
      }} />

      {/* Background decoration */}
      <div style={{
        position: "absolute",
        bottom: "-20px", right: "-20px",
        width: "80px", height: "80px",
        borderRadius: "50%",
        background: bgGradient,
        opacity: 0.06,
        pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: "11.5px",
          fontWeight: 600,
          color: "#94A3B8",
          textTransform: "uppercase",
          letterSpacing: "0.6px",
          fontFamily: "'Outfit', sans-serif"
        }}>
          {title}
        </span>
        <div style={{
          width: "32px", height: "32px",
          borderRadius: "8px",
          background: bgGradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white",
          flexShrink: 0,
          opacity: 0.85
        }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      {isBadge ? (
        <span style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: "20px",
          background: badgeStyle.bg,
          color: badgeStyle.text,
          fontSize: "14px",
          fontWeight: 700,
          textTransform: "capitalize",
          fontFamily: "'Outfit', sans-serif",
          width: "fit-content"
        }}>
          {value}
        </span>
      ) : (
        <div style={{
          fontSize: "28px",
          fontWeight: 800,
          color: accentColor,
          lineHeight: 1,
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: "-0.5px"
        }}>
          {displayValue.toLocaleString()}
          {unit && (
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#CBD5E1", marginLeft: "3px" }}>
              {unit}
            </span>
          )}
        </div>
      )}

      {/* Trend */}
      {showTrend && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "2px",
            fontSize: "11px",
            fontWeight: 700,
            color: isGood ? "#10B981" : "#EF4444",
            background: isGood ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            padding: "2px 6px",
            borderRadius: "20px",
            fontFamily: "'Outfit', sans-serif"
          }}>
            {isUp ? "▲" : "▼"} {pct}%
          </span>
          <span style={{ fontSize: "11px", color: "#CBD5E1", fontFamily: "'Outfit', sans-serif" }}>
            vs last period
          </span>
        </div>
      )}

      {!showTrend && isLive && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{
            width: "5px", height: "5px",
            borderRadius: "50%",
            background: "#10B981",
            animation: "livePulse 2s infinite",
            display: "inline-block"
          }} />
          <span style={{ fontSize: "11px", color: "#10B981", fontFamily: "'Outfit', sans-serif" }}>
            Updating live
          </span>
        </div>
      )}
    </div>
  )
}
