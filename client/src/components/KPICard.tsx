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
  invertTrend?: boolean   // true = up is bad (violations, anomalies)
  tone?: "hero" | "soft"
  size?: "lg" | "md"
}

function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace("#", "")
  const isShort = sanitized.length === 3
  const full = isShort
    ? sanitized.split("").map(char => char + char).join("")
    : sanitized

  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
  invertTrend = false,
  tone = "soft",
  size = "md"
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
  const isHero = tone === "hero"
  const isLarge = size === "lg"

  const cardBackground = isHero
    ? bgGradient
    : `linear-gradient(138deg, rgba(255,255,255,0.98), ${hexToRgba(accentColor, 0.08)})`

  const cardShadow = isHero
    ? "0 8px 16px rgba(15,23,42,0.07), inset 0 0 0 1px rgba(255,255,255,0.16)"
    : "0 2px 10px rgba(15,23,42,0.08), inset 0 0 0 1px rgba(15,23,42,0.06)"

  const titleColor = isHero ? "rgba(255,255,255,0.94)" : "#0F172A"
  const valueColor = isHero ? "#FFFFFF" : accentColor
  const unitColor = isHero ? "rgba(248,250,252,0.88)" : "#64748B"
  const helperColor = isHero ? "rgba(255,255,255,0.78)" : "#64748B"
  const iconBg = isHero ? "rgba(255,255,255,0.14)" : hexToRgba(accentColor, 0.16)
  const iconBorder = isHero ? "1px solid rgba(255,255,255,0.3)" : `1px solid ${hexToRgba(accentColor, 0.32)}`
  const textureOpacity = isHero ? 0.08 : 0.16
  const circleColor = isHero ? "rgba(255,255,255,0.1)" : hexToRgba(accentColor, 0.10)

  return (
    <div style={{
      background: cardBackground,
      borderRadius: "12px",
      padding: isLarge ? "16px 16px 14px" : "13px 13px 11px",
      boxShadow: cardShadow,
      minHeight: isLarge ? "124px" : "106px",
      display: "flex",
      flexDirection: "column",
      gap: isLarge ? "9px" : "7px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
      position: "relative",
      overflow: "hidden",
      cursor: "default"
    }}>
      {/* Ambient texture */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 0.6px, transparent 0.6px)",
        backgroundSize: "4px 4px",
        opacity: textureOpacity,
        pointerEvents: "none"
      }} />

      {/* Top glow to keep hero colors lively */}
      {isHero && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(168deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 54%, rgba(255,255,255,0) 100%)",
          pointerEvents: "none"
        }} />
      )}

      {/* Background circles */}
      <div style={{
        position: "absolute",
        top: "-34px", right: "-26px",
        width: "104px", height: "104px",
        borderRadius: "50%",
        background: circleColor,
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-42px", right: "20px",
        width: "122px", height: "122px",
        borderRadius: "50%",
        background: circleColor,
        pointerEvents: "none"
      }} />

      {/* Inner shadow for depth */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "12px",
        boxShadow: isHero ? "inset 0 -10px 18px rgba(15,23,42,0.06)" : "inset 0 -16px 28px rgba(15,23,42,0.06)",
        pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: isLarge ? "13px" : "12px",
          fontWeight: 800,
          color: titleColor,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontFamily: "'Outfit', sans-serif"
        }}>
          {title}
        </span>
        <div style={{
          width: isLarge ? "24px" : "22px", height: isLarge ? "24px" : "22px",
          borderRadius: "6px",
          background: iconBg,
          border: iconBorder,
          backdropFilter: "blur(1.5px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isHero ? "white" : accentColor,
          flexShrink: 0,
          opacity: 0.95
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
          fontSize: "16px",
          fontWeight: 700,
          textTransform: "capitalize",
          fontFamily: "'Outfit', sans-serif",
          width: "fit-content"
        }}>
          {value}
        </span>
      ) : (
        <div style={{
          fontSize: isLarge ? "54px" : "44px",
          fontWeight: 700,
          color: valueColor,
          lineHeight: 0.95,
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: "-0.8px",
          textShadow: isHero ? "0 1px 6px rgba(2,6,23,0.2)" : "none"
        }}>
          {displayValue.toLocaleString()}
          {unit && (
            <span style={{ fontSize: isLarge ? "38px" : "32px", fontWeight: 500, color: unitColor, marginLeft: "4px" }}>
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
            fontSize: "12px",
            fontWeight: 700,
            color: isHero ? "#F8FAFC" : (isGood ? "#0F766E" : "#9F1239"),
            background: isGood ? (isHero ? "rgba(16,185,129,0.22)" : "rgba(16,185,129,0.16)") : (isHero ? "rgba(239,68,68,0.22)" : "rgba(239,68,68,0.16)"),
            padding: "2px 6px",
            borderRadius: "20px",
            fontFamily: "'Outfit', sans-serif"
          }}>
            {isUp ? "▲" : "▼"} {pct}%
          </span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: helperColor, fontFamily: "'Outfit', sans-serif" }}>
            vs last period
          </span>
        </div>
      )}

    </div>
  )
}
