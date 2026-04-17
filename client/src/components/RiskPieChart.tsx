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
    { value: totals.Low, name: "Low", itemStyle: { color: RISK_LEVEL_COLORS.Low } },
    { value: totals.Medium, name: "Medium", itemStyle: { color: RISK_LEVEL_COLORS.Medium } },
    { value: totals.High, name: "High", itemStyle: { color: RISK_LEVEL_COLORS.High } },
    { value: totals.Critical, name: "Critical", itemStyle: { color: RISK_LEVEL_COLORS.Critical } }
  ]

  const chartData = allData.filter(entry => entry.value > 0)

  const option = {
    color: chartData.map(entry => entry.itemStyle.color),
    title: {
      text: "Risk Level Distribution",
      subtext: "Across all departments and time periods",
      left: "center",
      textStyle: { fontSize: 13, color: "#1F3A6E" }
    },
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} days ({d}%)"
    },
    legend: {
      orient: "vertical",
      right: 10,
      top: "middle",
      data: [...ALL_LEVELS]
    },
    series: [
      {
        name: "Risk Level",
        type: "pie",
        radius: ["38%", "66%"],
        center: ["40%", "60%"],
        data: chartData,
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
      <ReactECharts option={option} notMerge style={{ height: "280px" }} />
    </div>
  )
}
