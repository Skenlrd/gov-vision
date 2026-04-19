import { useState, useEffect, useCallback, useRef } from "react"
import type { IKpiSummary, IFilter, IRiskHeatmapRow, RiskLevel } from "../types"
import { RISK_LEVEL_THEME } from "../types"
import {
  getKpiSummary, getDeptKpiSummary, getRiskHeatmap
} from "../services/api"
import KPICard from "../components/KPICard"
import AnomalyFeed from "../components/AnomalyFeed"
import ErrorBoundary from "../components/ErrorBoundary"
import DecisionVolumeChart from "../components/charts/DecisionVolumeChart"
import CycleTimeHistogram from "../components/charts/CycleTimeHistogram"
import ComplianceTrendChart from "../components/charts/ComplianceTrendChart"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const Icons = {
  decisions:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  approval:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>,
  rejection:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  cycle:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  bottleneck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>,
  pending:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  compliance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  violation:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  throughput: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  anomaly:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  risk:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
}

function getDefaultFilters(): IFilter {
  const today = new Date()
  return { dateFrom: "2024-01-01", dateTo: today.toISOString().split("T")[0], deptId: null }
}

const DEPARTMENTS = [
  { label: "All Departments", value: "" },
  { label: "Finance", value: "Finance" },
  { label: "Human Resources", value: "Human Resources" },
  { label: "Operations", value: "Operations" },
  { label: "Information Technology", value: "Information Technology" },
  { label: "Customer Service", value: "Customer Service" }
]

function getRiskCellStyle(level: RiskLevel, value: number) {
  const theme = RISK_LEVEL_THEME[level]
  if (value <= 0) {
    return {
      background: "#F8FAFC",
      color: "#64748B"
    }
  }

  if (value >= 8) {
    return {
      background: theme.fill,
      color: theme.text
    }
  }

  if (value >= 4) {
    return {
      background: theme.border,
      color: theme.text
    }
  }

  return {
    background: theme.bg,
    color: theme.text
  }
}

function getDepartmentLabel(deptIdOrName: string): string {
  const match = DEPARTMENTS.find(d => d.value === deptIdOrName)
  return match ? match.label : deptIdOrName
}

type DropdownOption = {
  label: string
  value: string
}

function AccentDropdown({
  value,
  options,
  onChange,
  width = "170px"
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", onMouseDown)
    return () => window.removeEventListener("mousedown", onMouseDown)
  }, [])

  const selected = options.find(option => option.value === value) ?? options[0]

  return (
    <div ref={rootRef} style={{ position: "relative", width }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: "100%",
          padding: "7px 12px",
          borderRadius: "8px",
          border: open ? "1px solid var(--accent-600)" : "1px solid #E2E6ED",
          background: "white",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--accent-700)",
          fontFamily: "'Outfit', sans-serif",
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: open ? "0 0 0 3px var(--accent-ring)" : "none"
        }}
      >
        <span>{selected?.label}</span>
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "#6B7280", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid var(--accent-300)",
            borderRadius: "10px",
            boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
            padding: "5px",
            zIndex: 60
          }}
        >
          {options.map(option => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: "100%",
                  border: "none",
                  background: isSelected ? "#E5E7EB" : "transparent",
                  color: isSelected ? "#111827" : "#334155",
                  borderRadius: "7px",
                  textAlign: "left",
                  padding: "7px 10px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: "'Outfit', sans-serif",
                  cursor: "pointer",
                  transition: "background 0.15s ease,color 0.15s ease"
                }}
                onMouseEnter={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "#F3F4F6"
                  event.currentTarget.style.color = "#1F2937"
                }}
                onMouseLeave={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "transparent"
                  event.currentTarget.style.color = "#334155"
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TIMEFRAME_OPTIONS: DropdownOption[] = [
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
  { label: "2025", value: "2025" },
  { label: "All Data", value: "all" }
]

export default function Dashboard() {
  const [filters,     setFilters]     = useState<IFilter>(getDefaultFilters())
  const [kpi,         setKpi]         = useState<IKpiSummary | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [timeframe,   setTimeframe]   = useState("all")
  const [heatmapData, setHeatmapData] = useState<IRiskHeatmapRow[]>([])
  const [heatmapLoading, setHeatmapLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      setHeatmapLoading(true)
      const [kpiData, riskData] = await Promise.all([
        filters.deptId ? getDeptKpiSummary(filters.deptId, filters) : getKpiSummary(filters),
        getRiskHeatmap(filters)
      ])

      setKpi(kpiData)
      setHeatmapData(riskData)
      setHeatmapLoading(false)
      setRefreshTick(t => t + 1)
    } catch (err) {
      setHeatmapLoading(false)
      console.error("Dashboard fetch error:", err)
    }
  }, [filters])

  useEffect(() => {
    fetchAll()
    const iv = setInterval(() => {
      fetchAll()
    }, 30000)
    return () => clearInterval(iv)
  }, [fetchAll])

  const totalDecisions = kpi?.totalDecisions ?? 0
  const approvalRate   = totalDecisions > 0 ? Number(((kpi!.approvedCount / totalDecisions) * 100).toFixed(1)) : 0
  const rejectionRate  = totalDecisions > 0 ? Number(((kpi!.rejectedCount  / totalDecisions) * 100).toFixed(1)) : 0
  const days = Math.max(1, (new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / 86400000)
  const throughput = totalDecisions > 0 ? Math.round(((kpi!.approvedCount + kpi!.rejectedCount) / days)) : 0

  const applyPreset = (d: number | "all" | "2025") => {
    if (d === "all") {
      const today = new Date()
      setTimeframe("all")
      setFilters(f => ({ ...f, dateFrom: "2024-01-01", dateTo: today.toISOString().split("T")[0] }))
      return
    }

    if (d === "2025") {
      setTimeframe("2025")
      setFilters(f => ({ ...f, dateFrom: "2025-01-01", dateTo: "2025-12-31" }))
      return
    }

    const today = new Date(); const from = new Date()
    from.setDate(today.getDate() - d)
    setTimeframe(String(d))
    setFilters(f => ({ ...f, dateFrom: from.toISOString().split("T")[0], dateTo: today.toISOString().split("T")[0] }))
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        @keyframes liveTextBlink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:4px}
      `}</style>
      <div style={{ display:"flex", flexDirection:"column", minWidth:0 }}>
        <main style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"20px", animation:"fadeSlideIn 0.5s ease" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" }}>
            <div>
              <div style={{ fontSize:"12px", color:"#94A3B8", marginBottom:"4px", display:"flex", alignItems:"center", gap:"6px" }}>
                <span>Home</span><span style={{color:"#CBD5E1"}}>›</span>
                <span>Dashboards</span><span style={{color:"#CBD5E1"}}>›</span>
                <span style={{color:"#374151",fontWeight:600}}>Analytics</span>
              </div>
              <h1 style={{ fontSize:"22px", fontWeight:800, color:"#0F172A", margin:0, letterSpacing:"-0.5px" }}>
                Analytics Dashboard
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <AccentDropdown
                value={timeframe}
                options={TIMEFRAME_OPTIONS}
                onChange={value => {
                  applyPreset(value === "all" || value === "2025" ? value : Number(value))
                }}
                width="150px"
              />


              <span style={{ color: "#CBD5E1" }}>—</span>

              <span style={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>From</span>

              <DatePicker
                selected={new Date(filters.dateFrom)}
                onChange={(date: Date | null) => {
                  if (date) setFilters(f => ({
                    ...f, dateFrom: date.toISOString().split("T")[0]
                  }))
                }}
                dateFormat="dd MMM yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="scroll"
                popperPlacement="bottom-start"
                maxDate={new Date(filters.dateTo)}
                minDate={new Date("2024-01-01")}
                customInput={
                  <input
                    style={{
                      background: "white",
                      border: "1px solid #E2E6ED",
                      borderRadius: "8px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      fontFamily: "'Outfit', sans-serif",
                      cursor: "pointer",
                      width: "120px",
                      outline: "none"
                    }}
                  />
                }
              />

              <span style={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>To</span>

              <DatePicker
                selected={new Date(filters.dateTo)}
                onChange={(date: Date | null) => {
                  if (date) setFilters(f => ({
                    ...f, dateTo: date.toISOString().split("T")[0]
                  }))
                }}
                dateFormat="dd MMM yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="scroll"
                popperPlacement="bottom-start"
                minDate={new Date(filters.dateFrom)}
                maxDate={new Date("2026-12-31")}
                customInput={
                  <input
                    style={{
                      background: "white",
                      border: "1px solid #E2E6ED",
                      borderRadius: "8px",
                      padding: "7px 12px",
                      fontSize: "12px",
                      fontFamily: "'Outfit', sans-serif",
                      cursor: "pointer",
                      width: "120px",
                      outline: "none"
                    }}
                  />
                }
              />

              <AccentDropdown
                value={filters.deptId ?? ""}
                options={DEPARTMENTS}
                onChange={value => setFilters(f => ({ ...f, deptId: value || null }))}
                width="180px"
              />
              <button style={{ display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", borderRadius:"8px", border:"1px solid #E2E6ED", background:"white", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span style={{ display:"flex", flexDirection:"column", lineHeight:1.1, textAlign:"left" }}>
                  <span>Export Data</span>
                  <span style={{ fontSize:"10px", color:"#94A3B8", fontWeight:500 }}>CSV snapshot</span>
                </span>
              </button>
            </div>
          </div>

          {/* KPI Layout: 4 hero cards, 4 soft cards, then pending + 2 aligned cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,minmax(0,1fr))", gap:"14px" }}>
            <KPICard key={`kpi-total-${refreshTick}`} title="Total Decisions" value={totalDecisions} icon={Icons.decisions} accentColor="#DBE5FF" bgGradient="linear-gradient(140deg,#6F88D6,#516CC1)" tone="hero" size="lg" />
            <KPICard key={`kpi-approval-${refreshTick}`} title="Approval Rate" value={approvalRate} unit="%" icon={Icons.approval} accentColor="#C9EFDF" bgGradient="linear-gradient(140deg,#6EAB95,#4E8D76)" tone="hero" size="lg" />
            <KPICard key={`kpi-rejection-${refreshTick}`} title="Rejection Rate" value={rejectionRate} unit="%" icon={Icons.rejection} accentColor="#FFD0D4" bgGradient="linear-gradient(140deg,#D47A87,#B95A68)" invertTrend tone="hero" size="lg" />
            <KPICard key={`kpi-avg-${refreshTick}`} title="Avg Approval Time" value={Math.round(kpi?.avgCycleTimeHours??0)} unit="h" icon={Icons.cycle} accentColor="#FFE0C0" bgGradient="linear-gradient(140deg,#D8AF85,#BF946C)" tone="hero" size="lg" />

            <KPICard key={`kpi-bottle-${refreshTick}`} title="Bottleneck Rate" value={Number((kpi?.bottleneckRate ?? 0).toFixed(1))} unit="%" icon={Icons.bottleneck} accentColor="#7879F5" bgGradient="linear-gradient(140deg,#A27BFF,#8F55F3)" tone="soft" size="md" />
            <KPICard key={`kpi-comp-${refreshTick}`} title="Compliance Rate" value={Number((kpi?.complianceRate??0).toFixed(1))} unit="%" icon={Icons.compliance} accentColor="#41A471" bgGradient="linear-gradient(140deg,#26CC95,#0A9871)" tone="soft" size="md" />
            <KPICard key={`kpi-viol-${refreshTick}`} title="Violation Count" value={kpi?.violationCount??0} icon={Icons.violation} accentColor="#E47179" bgGradient="linear-gradient(140deg,#F76772,#D04555)" invertTrend tone="soft" size="md" />
            <KPICard key={`kpi-throughput-${refreshTick}`} title="Decision Throughput" value={throughput} unit="/day" icon={Icons.throughput} accentColor="#7D67DA" bgGradient="linear-gradient(140deg,#A181FF,#8050E2)" tone="soft" size="md" />

            <div style={{ gridColumn:"span 2" }}>
              <KPICard key={`kpi-pending-${refreshTick}`} title="Decisions Pending Count" value={kpi?.pendingCount ?? 0} icon={Icons.pending} accentColor="#3E78F0" bgGradient="linear-gradient(140deg,#6A95FF,#4179E5)" tone="soft" size="md" />
            </div>
            <KPICard key={`kpi-anomaly-${refreshTick}`} title="Anomaly Count" value={kpi?.anomalyCount??0} icon={Icons.anomaly} accentColor="#DF9A4B" bgGradient="linear-gradient(140deg,#FF9142,#F07021)" invertTrend tone="soft" size="md" />
            <KPICard key={`kpi-risk-${refreshTick}`} title="AI Risk Score" value={kpi?.riskLevel??"Low"} icon={Icons.risk} accentColor="#E16A73" bgGradient="linear-gradient(140deg,#F8707C,#D74D5C)" isBadge tone="soft" size="md" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: "16px", alignItems: "start" }}>

            <ErrorBoundary>
              <DecisionVolumeChart key={`decision-volume-${refreshTick}`} filters={filters} />
            </ErrorBoundary>

            <ErrorBoundary>
              <CycleTimeHistogram key={`cycle-hist-${refreshTick}`} filters={filters} />
            </ErrorBoundary>

            {/* Anomaly Feed — unchanged */}
            <div style={{ height: "360px" }}>
              <AnomalyFeed key={`anomaly-feed-${refreshTick}`} />
            </div>

          </div>

          {/* Compliance Trend — full width */}
          <ErrorBoundary>
            <ComplianceTrendChart key={`compliance-trend-${refreshTick}`} filters={filters} />
          </ErrorBoundary>

          {/* Risk Heatmap */}
          <div style={{ background:"white", borderRadius:"14px", padding:"20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <div>
                <h2 style={{ fontSize:"14px", fontWeight:700, color:"#1E293B", margin:0 }}>Departmental Risk Heatmap</h2>
                <p style={{ fontSize:"12px", color:"#94A3B8", margin:"2px 0 0" }}>Risk concentration by category</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                {(["Low", "Medium", "High", "Critical"] as const).map(level => (
                  <div key={level} style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                    <div
                      style={{
                        width:"12px",
                        height:"12px",
                        background:RISK_LEVEL_THEME[level].fill,
                        border:`1px solid ${RISK_LEVEL_THEME[level].border}`,
                        borderRadius:"3px"
                      }}
                    />
                    <span style={{ fontSize:"11px", color:"#94A3B8" }}>{level}</span>
                  </div>
                ))}
              </div>
            </div>

            {heatmapLoading ? (
              <div style={{ height:"200px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"8px", textAlign:"center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.8} width="40" height="40">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="9" y1="10" x2="9" y2="21" />
                  <line x1="15" y1="10" x2="15" y2="21" />
                </svg>
                <p style={{ fontSize:"13px", color:"#94A3B8", margin:0 }}>Loading heatmap data...</p>
              </div>
            ) : heatmapData.length === 0 ? (
              <div style={{ height:"200px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"8px", textAlign:"center" }}>
                <p style={{ fontSize:"13px", color:"#94A3B8", margin:0 }}>No heatmap rows for selected date range.</p>
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:"6px", fontFamily:"'Outfit',sans-serif" }}>
                  <thead>
                    <tr>
                      <th style={{ width:"160px", fontSize:"11px", color:"#94A3B8", fontWeight:600, textAlign:"left" }}>Department</th>
                      {["Low", "Medium", "High", "Critical"].map(level => (
                        <th key={level} style={{ fontSize:"11px", color:"#94A3B8", fontWeight:600, padding:"4px 8px", textAlign:"center" }}>{level}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map(row => {
                      const values = [row.Low, row.Medium, row.High, row.Critical]
                      return (
                        <tr key={row.deptId}>
                          <td style={{ fontSize:"12px", color:"#334155", fontWeight:700, padding:"6px 8px" }}>
                            {getDepartmentLabel(row.department || row.deptId)}
                          </td>
                          {values.map((v, i) => {
                            const level = (["Low", "Medium", "High", "Critical"] as const)[i]
                            const cellStyle = getRiskCellStyle(level, v)

                            return (
                              <td
                                key={`${row.deptId}-${i}`}
                                style={{
                                  background: cellStyle.background,
                                  borderRadius: "8px",
                                  textAlign: "center",
                                  padding: "10px 6px",
                                  fontSize: "13px",
                                  fontWeight: 700,
                                  color: cellStyle.color,
                                  minWidth: "70px"
                                }}
                              >
                                {v}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
