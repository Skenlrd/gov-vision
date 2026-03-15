import { useState, useEffect } from "react"
import type { IFilter, IDecisionVolumePoint } from "../../types"
import { getDecisionVolume } from "../../services/api"
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip
} from "recharts"

/*
  DecisionVolumeChart is fully self-contained.
  It owns its own data, chartType, granularity, and loading states.
  The only thing Dashboard.tsx passes in is filters — the single
  source of truth for date range and department selection.
  When filters change, this component re-fetches automatically.
*/

interface Props {
  filters: IFilter
}

type ChartType = "line" | "bar"
type Granularity = "daily" | "weekly" | "monthly"

/*
  Custom tooltip — shared by both chart types.
  White card with Outfit font, consistent with the rest of the UI.
*/
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "white", border: "1px solid #E2E6ED",
      borderRadius: "10px", padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
      fontFamily: "'Outfit', sans-serif"
    }}>
      <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>{label}</p>
      <p style={{ fontSize: "13px", fontWeight: 700, color: "#3B82F6", margin: 0 }}>
        Decisions: <span style={{ color: "#1E293B" }}>{payload[0].value}</span>
      </p>
    </div>
  )
}

/*
  Toggle button — reused for both the granularity group
  and the chart type group. Active state = white with shadow.
*/
function ToggleBtn({
  label, active, onClick
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: "6px", border: "none",
        background: active ? "white" : "transparent",
        fontSize: "11px",
        fontWeight: active ? 700 : 500,
        color: active ? "#1E293B" : "#94A3B8",
        cursor: "pointer",
        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
        fontFamily: "'Outfit', sans-serif",
        transition: "all 0.15s"
      }}
    >
      {label}
    </button>
  )
}

export default function DecisionVolumeChart({ filters }: Props) {
  const [data, setData] = useState<IDecisionVolumePoint[]>([])
  const [chartType, setChartType] = useState<ChartType>("line")
  const [granularity, setGranularity] = useState<Granularity>("daily")
  const [loading, setLoading] = useState(true)

  /*
    Re-fetch whenever filters OR granularity changes.
    filters comes from Dashboard — date range + department.
    granularity is local to this component.
  */
  useEffect(() => {
    let cancelled = false

    const fetch = async () => {
      try {
        setLoading(true)
        const result = await getDecisionVolume(filters, granularity)
        if (!cancelled) setData(result)
      } catch (err) {
        console.error("DecisionVolumeChart fetch error:", err)
        if (!cancelled) setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [filters, granularity])

  return (
    <div style={{
      background: "white", borderRadius: "14px", padding: "20px",
      border: "1px solid #E2E6ED",
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
    }}>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
            Decision Throughput & Volume
          </h2>
          <p style={{ fontSize: "12px", color: "#94A3B8", margin: "2px 0 0", fontFamily: "'Outfit', sans-serif" }}>
            Trend analysis
          </p>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {/* Granularity toggle */}
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: "8px", padding: "3px" }}>
            <ToggleBtn label="Daily" active={granularity === "daily"} onClick={() => setGranularity("daily")} />
            <ToggleBtn label="Weekly" active={granularity === "weekly"} onClick={() => setGranularity("weekly")} />
            <ToggleBtn label="Monthly" active={granularity === "monthly"} onClick={() => setGranularity("monthly")} />
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "20px", background: "#E2E6ED" }} />

          {/* Chart type toggle */}
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: "8px", padding: "3px" }}>
            <ToggleBtn label="Line" active={chartType === "line"} onClick={() => setChartType("line")} />
            <ToggleBtn label="Bar" active={chartType === "bar"} onClick={() => setChartType("bar")} />
          </div>
        </div>
      </div>

      {/* Chart area */}
      {loading ? (
        <div style={{
          height: "220px", display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            width: "30px", height: "30px",
            border: "3px solid #E2E6ED",
            borderTop: "3px solid #3B82F6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>

          {chartType === "line" ? (

            <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                tickFormatter={d => d.slice(5)}
                tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Outfit" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Outfit" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="count"
                stroke="#3B82F6" strokeWidth={2.5}
                fill="url(#volGrad)" dot={false}
                activeDot={{ r: 5, fill: "#3B82F6", stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>

          ) : (

            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="date"
                tickFormatter={d => d.slice(5)}
                tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Outfit" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Outfit" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>

          )}
        </ResponsiveContainer>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div style={{
          height: "220px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "8px"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} width="36" height="36">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <p style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Outfit', sans-serif" }}>
            No data for selected period
          </p>
        </div>
      )}
    </div>
  )
}
