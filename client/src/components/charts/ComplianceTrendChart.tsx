import { useState, useEffect } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import type { IFilter, IComplianceTrendSeries } from "../../types"
import { getComplianceTrend } from "../../services/api"

interface Props {
  filters: IFilter
}

/*
  ECharts default colour palette — 10 distinct colours.
  One colour per department line, assigned in order.
  ECharts uses this automatically if you don't set 'color'
  on individual series, but we set it explicitly here
  so the legend colours are predictable.
*/
const DEPT_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EF4444", "#06B6D4",
  "#F97316", "#84CC16", "#EC4899", "#6366F1"
]

export default function ComplianceTrendChart({ filters }: Props) {
  const [data, setData] = useState<IComplianceTrendSeries[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        setLoading(true)
        const result = await getComplianceTrend(filters)
        if (!cancelled) setData(result)
      } catch (err) {
        console.error("ComplianceTrendChart fetch error:", err)
        if (!cancelled) setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [filters])

  /*
    X-axis dates come from the first department's data array.
    All departments share the same date range so this is safe.
    Slice to MM-DD for display compactness.
  */
  const xAxisDates = data[0]?.data.map(d => d.date.slice(5)) ?? []

  /*
    Build one ECharts series per department.
    markLine at Y=95 is added to the FIRST series only —
    if added to all series it renders duplicate lines.
  */
  const series: EChartsOption["series"] = data.map((dept, idx) => ({
    name: dept.department,
    type: "line",
    smooth: true,
    color: DEPT_COLORS[idx % DEPT_COLORS.length],
    data: dept.data.map(d => d.complianceRate),
    symbol: "circle",
    symbolSize: 5,
    lineStyle: { width: 2 },
    emphasis: { focus: "series" },
    ...(idx === 0 ? {
      markLine: {
        silent: true,
        data: [{ yAxis: 95 }],
        lineStyle: { type: "dashed", color: "#EF4444", width: 1.5 },
        label: {
          formatter: "Target: 95%",
          fontFamily: "Outfit",
          fontSize: 10,
          color: "#EF4444",
          position: "end"
        },
        symbol: ["none", "none"]
      }
    } : {})
  }))

  const option: EChartsOption = {
    grid: { top: 30, right: 20, bottom: 50, left: 50 },
    color: DEPT_COLORS,
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
        const lines = params.map((p: any) =>
          `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>` +
          `${p.seriesName}: <b>${p.value?.toFixed(1)}%</b>`
        ).join("<br/>")
        return `<div style="font-family:Outfit;font-size:12px"><div style="color:#64748B;margin-bottom:4px">${params[0].axisValue}</div>${lines}</div>`
      }
    },
    legend: {
      bottom: 0,
      textStyle: { fontFamily: "Outfit", fontSize: 11, color: "#64748B" },
      itemWidth: 12,
      itemHeight: 8
    },
    xAxis: {
      type: "category",
      data: xAxisDates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontFamily: "Outfit", fontSize: 10, color: "#94A3B8" },
      splitLine: { show: false }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: {
        formatter: "{value}%",
        fontFamily: "Outfit",
        fontSize: 10,
        color: "#94A3B8"
      },
      splitLine: { lineStyle: { color: "#F1F5F9" } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series
  }

  return (
    <div style={{
      background: "white", borderRadius: "14px", padding: "20px",
      border: "1px solid #E2E6ED",
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
    }}>

      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
          Compliance Rate Trend
        </h2>
        <p style={{ fontSize: "12px", color: "#94A3B8", margin: "2px 0 0", fontFamily: "'Outfit', sans-serif" }}>
          Target: 95% — by department
        </p>
      </div>

      {/* Spinner */}
      {loading ? (
        <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: "30px", height: "30px",
            border: "3px solid #E2E6ED", borderTop: "3px solid #10B981",
            borderRadius: "50%", animation: "spin 0.8s linear infinite"
          }} />
        </div>
      ) : data.length === 0 ? (

        /* Empty state */
        <div style={{
          height: "260px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "8px"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} width="36" height="36">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Outfit', sans-serif" }}>
            No compliance data for selected filters
          </p>
        </div>

      ) : (
        <ReactECharts
          option={option}
          style={{ height: "260px" }}
          notMerge={true}
          lazyUpdate={false}
        />
      )}
    </div>
  )
}
