import { useMemo } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import type { IForecastPoint, ForecastTarget } from "../types"

type ForecastChartProps = {
  data: IForecastPoint[]
  target: ForecastTarget
  horizon: 7 | 14 | 30
  department: string
}

function formatDateLabel(dateValue: string): string {
  const date = new Date(dateValue)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date)
}

function metricLabel(target: ForecastTarget): string {
  const labels: Record<ForecastTarget, string> = {
    volume: "Decision volume",
    delay: "Delay",
    approval_rate: "Approval rate",
    rejection_rate: "Rejection rate",
    pending_workload: "Pending workload",
    sla_misses: "SLA misses"
  }

  return labels[target]
}

export default function ForecastChart({ data, target, horizon, department }: ForecastChartProps) {
  const option = useMemo<EChartsOption>(() => {
    const dates = data.map(point => formatDateLabel(point.ds))
    const maxValue = Math.max(...data.map(point => point.yhat_upper), 0)
    const isVolumeLike = target === "volume" || target === "pending_workload" || target === "sla_misses"
    const baseColor = isVolumeLike ? "#3B82F6" : "#4B5563"
    const bandColor = isVolumeLike ? "rgba(59,130,246,0.18)" : "rgba(75,85,99,0.18)"

    return {
      backgroundColor: "transparent",
      grid: { top: 48, right: 28, bottom: 52, left: 56 },
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
          const point = data[index]
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
        show: true,
        top: 8,
        right: 12,
        itemGap: 16,
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
          data: data.map(point => point.yhat_upper),
          symbol: "none",
          lineStyle: { opacity: 0 },
          areaStyle: { color: bandColor },
          stack: "forecast-band",
          emphasis: { disabled: true }
        },
        {
          name: "Lower bound",
          type: "line",
          data: data.map(point => point.yhat_lower),
          symbol: "none",
          lineStyle: { opacity: 0 },
          areaStyle: { color: "#FFFFFF" },
          stack: "forecast-band",
          emphasis: { disabled: true }
        },
        {
          name: metricLabel(target),
          type: "line",
          data: data.map(point => point.yhat),
          symbol: "circle",
          symbolSize: 7,
          smooth: true,
          lineStyle: { color: baseColor, width: 3 },
          itemStyle: { color: baseColor },
          emphasis: { focus: "series" }
        }
      ]
    }
  }, [data, target])

  if (data.length === 0) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-[18px] border border-[#E2E6ED] bg-white text-sm text-[#64748B]">
        No forecast data available for {department} · {horizon} days
      </div>
    )
  }

  return (
    <div className="rounded-[18px] border border-[#E2E6ED] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-[16px] font-extrabold text-[#1E293B]" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {metricLabel(target)} over time
          </h2>
          <p className="mt-1 text-xs text-[#94A3B8]">
            The solid line is the Prophet midpoint; the shaded band shows the confidence interval.
          </p>
        </div>
        <div className="text-xs text-[#64748B]">
          {data.length > 0 ? `${data.length} forecast points` : "No forecast points"}
        </div>
      </div>

      <ReactECharts option={option} style={{ height: 420, width: "100%" }} notMerge lazyUpdate />
    </div>
  )
}