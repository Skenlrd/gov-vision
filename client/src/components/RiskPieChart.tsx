import ReactECharts from "echarts-for-react"
import type { RiskEntry } from "../types"
import { RISK_LEVEL_COLORS } from "../types"

interface Props {
  data: RiskEntry[]
}

export default function RiskPieChart({ data }: Props) {
  const ALL_LEVELS = ["Low", "Medium", "High", "Critical"] as const

  const totals = data.reduce(
    (acc, row) => ({
      Low: acc.Low + (row.Low || 0),
      Medium: acc.Medium + (row.Medium || 0),
      High: acc.High + (row.High || 0),
      Critical: acc.Critical + (row.Critical || 0)
    }),
    { Low: 0, Medium: 0, High: 0, Critical: 0 }
  )

  const allData = [
    { 
      value: totals.Low, 
      name: "Low", 
      itemStyle: { color: RISK_LEVEL_COLORS.Low },
      label: { show: totals.Low > 0 },
      labelLine: { show: totals.Low > 0 }
    },
    { 
      value: totals.Medium, 
      name: "Medium", 
      itemStyle: { color: RISK_LEVEL_COLORS.Medium },
      label: { show: totals.Medium > 0 },
      labelLine: { show: totals.Medium > 0 }
    },
    { 
      value: totals.High, 
      name: "High", 
      itemStyle: { color: RISK_LEVEL_COLORS.High },
      label: { show: totals.High > 0 },
      labelLine: { show: totals.High > 0 }
    },
    { 
      value: totals.Critical, 
      name: "Critical", 
      itemStyle: { color: RISK_LEVEL_COLORS.Critical },
      label: { show: totals.Critical > 0 },
      labelLine: { show: totals.Critical > 0 }
    }
  ]

  const option = {
    color: allData.map(entry => entry.itemStyle.color),
    title: {
      text: "Risk Level Distribution",
      subtext: "Across all departments and time periods",
      left: "center",
      textStyle: { fontSize: 13, color: "#1F3A6E" },
      subtextStyle: { fontSize: 11, color: "#64748B" }
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} days ({d}%)"
    },
    legend: {
      orient: "horizontal",
      bottom: 0,
      left: "center",
      data: [...ALL_LEVELS],
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { fontSize: 11, color: "#475569" }
    },
    series: [
      {
        name: "Risk Level",
        type: "pie",
        radius: ["40%", "60%"],
        center: ["50%", "54%"],
        data: allData,
        stillShowZeroSum: false,
        avoidLabelOverlap: true,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)"
          }
        },
        label: {
          show: true,
          alignTo: "edge",
          edgeDistance: 6,
          formatter: "{b}\n{d}%",
          fontSize: 11
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 10
        }
      }
    ]
  }

  return (
    <div className="bg-white rounded-xl border p-4">
      <ReactECharts option={option} notMerge style={{ height: "340px" }} />
    </div>
  )
}
