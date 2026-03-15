import { useState, useEffect } from "react"
import type { IFilter, ICycleTimeBucket } from "../../types"
import { getCycleTimeHistogram } from "../../services/api"
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Cell
} from "recharts"

interface Props {
  filters: IFilter
}

/*
  Each bucket gets a fixed colour.
  Key must match exactly what the backend returns
  in the 'bucket' field.
*/
const BUCKET_COLORS: Record<string, string> = {
  "0-24h": "#10B981",
  "24-48h": "#F59E0B",
  "48-72h": "#F97316",
  ">72h": "#EF4444"
}

const BUCKET_LABELS = ["0–24h", "24–48h", "48–72h", ">72h"]

/*
  Custom tooltip shows count AND percentage of total.
  Total is computed from the full data array passed in from parent.
*/
function buildTooltip(total: number) {
  return ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const count = payload[0].value as number
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"
    return (
      <div style={{
        background: "white", border: "1px solid #E2E6ED",
        borderRadius: "10px", padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        fontFamily: "'Outfit', sans-serif"
      }}>
        <p style={{ fontSize: "12px", color: "#64748B", marginBottom: "4px" }}>{label}</p>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "#1E293B", margin: 0 }}>
          {count.toLocaleString()} decisions
        </p>
        <p style={{ fontSize: "11px", color: "#94A3B8", margin: "2px 0 0" }}>
          {pct}% of total
        </p>
      </div>
    )
  }
}

export default function CycleTimeHistogram({ filters }: Props) {
  const [data, setData] = useState<ICycleTimeBucket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        setLoading(true)
        const result = await getCycleTimeHistogram(filters)
        if (!cancelled) setData(result)
      } catch (err) {
        console.error("CycleTimeHistogram fetch error:", err)
        if (!cancelled) setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [filters])

  /*
    Total is used by the tooltip to compute percentage.
    Computed here so it's available to the tooltip factory.
  */
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const TooltipContent = buildTooltip(total)

  return (
    <div style={{
      background: "white", borderRadius: "14px", padding: "20px",
      border: "1px solid #E2E6ED",
      boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
    }}>

      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
          Avg Approval Time Distribution
        </h2>
        <p style={{ fontSize: "12px", color: "#94A3B8", margin: "2px 0 0", fontFamily: "'Outfit', sans-serif" }}>
          Decisions bucketed by resolution time
        </p>
      </div>

      {/* Spinner */}
      {loading ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: "30px", height: "30px",
            border: "3px solid #E2E6ED", borderTop: "3px solid #F59E0B",
            borderRadius: "50%", animation: "spin 0.8s linear infinite"
          }} />
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Outfit" }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Outfit" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<TooltipContent />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={BUCKET_COLORS[entry.bucket] ?? "#94A3B8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Colour legend */}
          <div style={{
            display: "flex", gap: "14px", marginTop: "12px",
            justifyContent: "center", flexWrap: "wrap"
          }}>
            {Object.entries(BUCKET_COLORS).map(([key, color], i) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{
                  width: "10px", height: "10px",
                  borderRadius: "3px", background: color,
                  display: "inline-block"
                }} />
                <span style={{ fontSize: "11px", color: "#64748B", fontFamily: "'Outfit', sans-serif" }}>
                  {BUCKET_LABELS[i]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div style={{
          height: "200px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "8px"
        }}>
          <p style={{ fontSize: "13px", color: "#94A3B8", fontFamily: "'Outfit', sans-serif" }}>
            No cycle time data available
          </p>
        </div>
      )}
    </div>
  )
}
