import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import { getForecast } from "../services/api"
import type { ForecastTarget, IForecastData, IForecastPoint } from "../types"
import SkeletonLoader from "../components/SkeletonLoader"

const DEPARTMENT_PRESETS = [
  { label: "Organization Wide", value: "org" },
  { label: "Finance", value: "finance" },
  { label: "Operations", value: "operations" },
  { label: "Human Resources", value: "hr" },
  { label: "Legal", value: "legal" },
  { label: "Procurement", value: "procurement" }
]

const HORIZONS = [7, 14, 30] as const
const TARGETS: Array<{ label: string; value: ForecastTarget }> = [
  { label: "Volume", value: "volume" },
  { label: "Delay", value: "delay" },
  { label: "Approval Rate", value: "approval_rate" },
  { label: "Rejection Rate", value: "rejection_rate" },
  { label: "Pending Workload", value: "pending_workload" },
  { label: "SLA Misses", value: "sla_misses" }
]

const TARGET_META: Record<ForecastTarget, { label: string; title: string; unit: string; description: string }> = {
  volume: {
    label: "Decision volume",
    title: "Decision Volume Forecast",
    unit: "decisions",
    description: "Predicted number of completed decisions by day from the nightly forecast cache."
  },
  delay: {
    label: "Delay",
    title: "Delay Forecast",
    unit: "hours",
    description: "Predicted average processing delay by day from the nightly forecast cache."
  },
  approval_rate: {
    label: "Approval rate",
    title: "Approval Rate Forecast",
    unit: "%",
    description: "Predicted percent of decisions approved each day from historical outcomes."
  },
  rejection_rate: {
    label: "Rejection rate",
    title: "Rejection Rate Forecast",
    unit: "%",
    description: "Predicted percent of decisions rejected each day from historical outcomes."
  },
  pending_workload: {
    label: "Pending workload",
    title: "Pending Workload Forecast",
    unit: "decisions",
    description: "Predicted number of decisions expected to remain pending each day."
  },
  sla_misses: {
    label: "SLA misses",
    title: "SLA Misses Forecast",
    unit: "decisions",
    description: "Predicted number of decisions likely to miss SLA each day."
  }
}

function formatDateLabel(dateValue: string): string {
  const date = new Date(dateValue)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date)
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date)
}

function metricLabel(target: ForecastTarget): string {
  return TARGET_META[target].label
}

function metricUnit(target: ForecastTarget): string {
  return TARGET_META[target].unit
}

function getDepartmentDisplayName(value: string): string {
  const match = DEPARTMENT_PRESETS.find(option => option.value === value)
  return match ? match.label : value
}

function ButtonPill({
  active,
  children,
  onClick
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid",
        borderColor: active ? "#4B5563" : "#D8DEE9",
        background: active ? "linear-gradient(135deg, #4B5563, #374151)" : "white",
        color: active ? "#F9FAFB" : "#334155",
        borderRadius: "999px",
        padding: "7px 14px",
        fontSize: "12px",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: active ? "0 8px 16px rgba(51,65,85,0.18)" : "none",
        transition: "all 0.15s ease"
      }}
    >
      {children}
    </button>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #E2E6ED",
        borderRadius: "16px",
        padding: "16px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
      }}
    >
      <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: "24px", fontWeight: 800, color: "#1E293B", fontFamily: "'Outfit', sans-serif" }}>
        {value}
      </p>
    </div>
  )
}

export default function ForecastPage() {
  const [deptId, setDeptId] = useState("org")
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(30)
  const [target, setTarget] = useState<ForecastTarget>("volume")
  const [forecast, setForecast] = useState<IForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activeDeptLabel = getDepartmentDisplayName(deptId)

  useEffect(() => {
    let cancelled = false

    const loadForecast = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getForecast(deptId, horizon, target)
        if (!cancelled) setForecast(result)
      } catch (err) {
        if (cancelled) return

        if (axios.isAxiosError(err)) {
          const message = (err.response?.data as { error?: string } | undefined)?.error
          setError(message || err.message || "Forecast data could not be loaded.")
        } else if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("Forecast data could not be loaded.")
        }

        setForecast(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadForecast()

    return () => {
      cancelled = true
    }
  }, [deptId, horizon, target])

  const points = forecast?.forecastData ?? []

  const chartOption = useMemo<EChartsOption>(() => {
    const dates = points.map(point => formatDateLabel(point.ds))
    const maxValue = Math.max(...points.map(point => point.yhat_upper), 0)
    const isVolumeLike = target === "volume" || target === "pending_workload" || target === "sla_misses"
    const baseColor = isVolumeLike ? "#3B82F6" : "#4B5563"
    const bandColor = isVolumeLike ? "rgba(59,130,246,0.18)" : "rgba(75,85,99,0.18)"

    return {
      backgroundColor: "transparent",
      grid: { top: 24, right: 28, bottom: 52, left: 56 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "white",
        borderColor: "#E2E6ED",
        borderWidth: 1,
        textStyle: {
          fontFamily: "Outfit",
          fontSize: 12,
          color: "#1E293B"
        },
        formatter: (params: any) => {
          const index = params?.[0]?.dataIndex ?? 0
          const point = points[index]
          if (!point) return ""

          return [
            `<div style="font-family:Outfit;font-size:12px">`,
            `<div style="color:#64748B;margin-bottom:4px">${formatDateLabel(point.ds)}</div>`,
            `<div><span style="color:${baseColor};font-weight:700">${metricLabel(target)}:</span> ${point.yhat.toFixed(2)}</div>`,
            `<div><span style="color:#64748B">Lower bound:</span> ${point.yhat_lower.toFixed(2)}</div>`,
            `<div><span style="color:#64748B">Upper bound:</span> ${point.yhat_upper.toFixed(2)}</div>`,
            `</div>`
          ].join("")
        }
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: "#E2E6ED" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94A3B8",
          fontFamily: "Outfit",
          fontSize: 10,
          rotate: dates.length > 8 ? 25 : 0
        }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: maxValue > 0 ? Math.ceil(maxValue * 1.15) : undefined,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: "#F1F5F9" } },
        axisLabel: {
          color: "#94A3B8",
          fontFamily: "Outfit",
          fontSize: 10
        }
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: {
          fontFamily: "Outfit",
          fontSize: 11,
          color: "#64748B"
        },
        data: [metricLabel(target), "Upper bound", "Lower bound"]
      },
      series: [
        {
          name: "Upper bound",
          type: "line",
          data: points.map(point => point.yhat_upper),
          symbol: "none",
          lineStyle: { opacity: 0 },
          areaStyle: { color: bandColor },
          stack: "forecast-band",
          emphasis: { disabled: true }
        },
        {
          name: "Lower bound",
          type: "line",
          data: points.map(point => point.yhat_lower),
          symbol: "none",
          lineStyle: { opacity: 0 },
          areaStyle: { color: "#FFFFFF" },
          stack: "forecast-band",
          emphasis: { disabled: true }
        },
        {
          name: metricLabel(target),
          type: "line",
          data: points.map(point => point.yhat),
          symbol: "circle",
          symbolSize: 7,
          smooth: true,
          lineStyle: { color: baseColor, width: 3 },
          itemStyle: { color: baseColor },
          emphasis: { focus: "series" }
        }
      ]
    }
  }, [points, target])

  const summary = useMemo(() => {
    const total = points.reduce((sum, point) => sum + point.yhat, 0)
    const average = points.length > 0 ? total / points.length : 0
    const peakPoint = points.reduce<IForecastPoint | null>(
      (best, point) => (best && best.yhat >= point.yhat ? best : point),
      null
    )

    return { total, average, peakPoint }
  }, [points])

  return (
    <div style={{ minHeight: "100vh", padding: "28px", background: "linear-gradient(180deg, #F5F6FA 0%, #EEF2F7 100%)" }}>
      <div style={{ width: "100%" }}>
        <div style={{ marginBottom: "22px" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "#8A94A6", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Forecast
          </p>
          <h1 style={{ margin: "8px 0 6px", fontSize: "30px", lineHeight: 1.1, fontWeight: 800, color: "#1E293B", fontFamily: "'Outfit', sans-serif" }}>
            {TARGET_META[target].title}
          </h1>
          <p style={{ margin: 0, color: "#64748B", fontSize: "14px" }}>
            {TARGET_META[target].description}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "16px", marginBottom: "18px" }}>
          <div style={{ gridColumn: "span 12", background: "white", border: "1px solid #E2E6ED", borderRadius: "18px", padding: "18px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "36px", alignItems: "flex-start" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Departments
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, max-content)", gap: "8px" }}>
                  {DEPARTMENT_PRESETS.map(preset => (
                    <ButtonPill key={preset.value} active={deptId === preset.value} onClick={() => setDeptId(preset.value)}>
                      {preset.label}
                    </ButtonPill>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Horizon
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {HORIZONS.map(option => (
                    <ButtonPill key={option} active={horizon === option} onClick={() => setHorizon(option)}>
                      {option} Days
                    </ButtonPill>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "11px", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Target
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, max-content)", gap: "8px" }}>
                  {TARGETS.map(option => (
                    <ButtonPill key={option.value} active={target === option.value} onClick={() => setTarget(option.value)}>
                      {option.label}
                    </ButtonPill>
                  ))}
                </div>
              </div>

              <div style={{ marginLeft: "auto", textAlign: "right", alignSelf: "flex-end" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>
                  Active department: <strong style={{ color: "#1E293B" }}>{activeDeptLabel}</strong>
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748B" }}>
                  Last updated: <strong style={{ color: "#1E293B" }}>{forecast?.generatedAt ? formatDateTime(forecast.generatedAt) : "n/a"}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "18px" }}>
          <SummaryCard label={`Projected total (${metricUnit(target)})`} value={summary.total ? summary.total.toFixed(1) : "0.0"} />
          <SummaryCard label={`Average per day (${metricUnit(target)})`} value={summary.average ? summary.average.toFixed(1) : "0.0"} />
          <SummaryCard label="Peak day" value={summary.peakPoint ? `${formatDateLabel(summary.peakPoint.ds)} · ${summary.peakPoint.yhat.toFixed(1)}` : "n/a"} />
          <SummaryCard label="Forecast window" value={`${horizon} days`} />
        </div>

        <div style={{ background: "white", border: "1px solid #E2E6ED", borderRadius: "18px", padding: "20px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ marginBottom: "14px", display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#1E293B", fontFamily: "'Outfit', sans-serif" }}>
                {metricLabel(target)} over time
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94A3B8" }}>
                The solid line is the Prophet midpoint; the shaded band shows the confidence interval.
              </p>
            </div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>
              {points.length > 0 ? `${points.length} forecast points` : "No forecast points"}
            </div>
          </div>

          {loading ? (
            <SkeletonLoader rows={8} height="h-10" />
          ) : error ? (
            <div style={{ padding: "42px 12px", textAlign: "center", color: "#B91C1C", fontSize: "14px" }}>
              {error}
            </div>
          ) : points.length === 0 ? (
            <div style={{ padding: "42px 12px", textAlign: "center", color: "#64748B", fontSize: "14px" }}>
              No forecast data was returned for this combination.
            </div>
          ) : (
            <ReactECharts option={chartOption} style={{ height: 420, width: "100%" }} notMerge lazyUpdate />
          )}
        </div>
      </div>
    </div>
  )
}