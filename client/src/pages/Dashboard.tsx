import { useState, useEffect, useCallback, useRef } from "react"
import type { IKpiSummary, IAnomaly, IFilter } from "../types"
import {
  getKpiSummary, getDeptKpiSummary, getAnomalies,
  acknowledgeAnomaly
} from "../services/api"
import KPICard from "../components/KPICard"
import AnomalyFeed from "../components/AnomalyFeed"
import TopBar from "../components/TopBar"
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
  compliance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  violation:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  throughput: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  anomaly:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  risk:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
}

function getDefaultFilters(): IFilter {
  const today = new Date(); const thirty = new Date()
  thirty.setDate(today.getDate() - 30)
  return { dateFrom: thirty.toISOString().split("T")[0], dateTo: today.toISOString().split("T")[0], deptId: null }
}

const DEPARTMENTS = [
  { label: "All Departments", value: "" },
  { label: "Finance", value: "FI001" },
  { label: "Human Resources", value: "HR002" },
  { label: "Operations", value: "OP003" },
  { label: "Information Technology", value: "IT004" },
  { label: "Customer Service", value: "CS005" }
]

export default function Dashboard() {
  const [filters,     setFilters]     = useState<IFilter>(getDefaultFilters())
  const [kpi,         setKpi]         = useState<IKpiSummary | null>(null)
  const [anomalies,   setAnomalies]   = useState<IAnomaly[]>([])
  const [isLive,      setIsLive]      = useState(true)
  const [timeframe,   setTimeframe]   = useState("30")
  const [heatmapReady] = useState(false)
  const lastFetchRef = useRef<number>(Date.now())

  const fetchAll = useCallback(async () => {
    try {
      const kpiData = filters.deptId ? await getDeptKpiSummary(filters.deptId, filters) : await getKpiSummary(filters)
      setKpi(kpiData)
      const anomalyData = await getAnomalies()
      setAnomalies(anomalyData.filter(a => !a.isAcknowledged))
      lastFetchRef.current = Date.now(); setIsLive(true)
    } catch (err) {
      console.error("Dashboard fetch error:", err); setIsLive(false)
    }
  }, [filters])

  useEffect(() => {
    fetchAll()
    const iv = setInterval(() => {
      fetchAll()
      if (Date.now() - lastFetchRef.current > 35000) setIsLive(false)
    }, 30000)
    return () => clearInterval(iv)
  }, [fetchAll])

  const handleAcknowledge = async (id: string) => {
    setAnomalies(prev => prev.filter(a => a._id !== id))
    try { await acknowledgeAnomaly(id) } catch (err) { console.error(err) }
  }

  const totalDecisions = kpi?.totalDecisions ?? 0
  const approvalRate   = totalDecisions > 0 ? Math.round((kpi!.approvedCount / totalDecisions) * 100) : 0
  const rejectionRate  = totalDecisions > 0 ? Math.round((kpi!.rejectedCount  / totalDecisions) * 100) : 0
  const days = Math.max(1, (new Date(filters.dateTo).getTime() - new Date(filters.dateFrom).getTime()) / 86400000)
  const throughput = totalDecisions > 0 ? Math.round(((kpi!.approvedCount + kpi!.rejectedCount) / days)) : 0

  const applyPreset = (d: number) => {
    const today = new Date(); const from = new Date()
    from.setDate(today.getDate() - d)
    setTimeframe(String(d))
    setFilters(f => ({ ...f, dateFrom: from.toISOString().split("T")[0], dateTo: today.toISOString().split("T")[0] }))
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#F5F6FA", fontFamily:"'Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:4px}
      `}</style>

      <div style={{ width:"220px", flexShrink:0 }} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
        <TopBar isLive={isLive} anomalyCount={kpi?.anomalyCount ?? 0} openViolations={kpi?.openViolations ?? 0} />

        <main style={{ flex:1, padding:"24px", display:"flex", flexDirection:"column", gap:"20px", animation:"fadeSlideIn 0.5s ease" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" }}>
            <div>
              <div style={{ fontSize:"12px", color:"#94A3B8", marginBottom:"4px", display:"flex", alignItems:"center", gap:"6px" }}>
                <span>Home</span><span style={{color:"#CBD5E1"}}>›</span>
                <span>Dashboards</span><span style={{color:"#CBD5E1"}}>›</span>
                <span style={{color:"#3B82F6",fontWeight:600}}>Executive Analytics</span>
              </div>
              <h1 style={{ fontSize:"22px", fontWeight:800, color:"#0F172A", margin:0, letterSpacing:"-0.5px" }}>
                Executive Analytics Dashboard
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <select
                value={timeframe}
                onChange={e => applyPreset(Number(e.target.value))}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid #E2E6ED",
                  background: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#374151",
                  fontFamily: "'Outfit', sans-serif",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last 1 Year</option>
              </select>


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
                dropdownMode="select"
                maxDate={new Date(filters.dateTo)}
                minDate={new Date("2025-01-01")}
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
                dropdownMode="select"
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

              <select value={filters.deptId ?? ""} onChange={e => setFilters(f => ({ ...f, deptId: e.target.value || null }))}
                style={{ padding:"7px 12px", borderRadius:"8px", border:"1px solid #E2E8F4", background:"white", fontSize:"12px", fontWeight:600, color:"#374151", fontFamily:"'Outfit',sans-serif", outline:"none", cursor:"pointer" }}>
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <button style={{ display:"flex", alignItems:"center", gap:"6px", padding:"7px 14px", borderRadius:"8px", border:"1px solid #E2E6ED", background:"white", fontSize:"12px", fontWeight:600, color:"#374151", cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span style={{ display:"flex", flexDirection:"column", lineHeight:1.1, textAlign:"left" }}>
                  <span>Export Data</span>
                  <span style={{ fontSize:"10px", color:"#94A3B8", fontWeight:500 }}>CSV snapshot</span>
                </span>
              </button>
            </div>
          </div>

          {/* Row 1 — 5 KPI cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"14px" }}>
            <KPICard title="Total Decisions"    value={totalDecisions}                        icon={Icons.decisions}  accentColor="#3B82F6" bgGradient="linear-gradient(135deg,#3B82F6,#2563EB)" isLive={isLive} />
            <KPICard title="Approval Rate"      value={approvalRate}       unit="%"           icon={Icons.approval}   accentColor="#10B981" bgGradient="linear-gradient(135deg,#10B981,#059669)" />
            <KPICard title="Rejection Rate"     value={rejectionRate}      unit="%"           icon={Icons.rejection}  accentColor="#EF4444" bgGradient="linear-gradient(135deg,#EF4444,#DC2626)" invertTrend />
            <KPICard title="Avg Approval Time"  value={Math.round(kpi?.avgCycleTimeHours??0)} unit="h" icon={Icons.cycle} accentColor="#F59E0B" bgGradient="linear-gradient(135deg,#F59E0B,#D97706)" />
            <KPICard title="Bottleneck Rate"    value={0}                  unit="%"           icon={Icons.bottleneck} accentColor="#8B5CF6" bgGradient="linear-gradient(135deg,#8B5CF6,#7C3AED)" />
          </div>

          {/* Row 2 — 5 KPI cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"14px" }}>
            <KPICard title="Compliance Rate"    value={Math.round(kpi?.complianceRate??0)} unit="%" icon={Icons.compliance} accentColor="#10B981" bgGradient="linear-gradient(135deg,#10B981,#047857)" />
            <KPICard title="Violation Count"    value={kpi?.violationCount??0}                     icon={Icons.violation}  accentColor="#EF4444" bgGradient="linear-gradient(135deg,#EF4444,#B91C1C)" invertTrend />
            <KPICard title="Decision Throughput" value={throughput}         unit="/day"             icon={Icons.throughput} accentColor="#0EA5E9" bgGradient="linear-gradient(135deg,#38BDF8,#0284C7)" />
            <KPICard title="Anomaly Count"      value={kpi?.anomalyCount??0}                        icon={Icons.anomaly}    accentColor="#F97316" bgGradient="linear-gradient(135deg,#F97316,#EA580C)" invertTrend />
            <KPICard title="AI Risk Score"      value={kpi?.riskLevel??"Low"}                       icon={Icons.risk}       accentColor="#8B5CF6" bgGradient="linear-gradient(135deg,#8B5CF6,#6D28D9)" isBadge />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 320px", gap: "16px", alignItems: "start" }}>

            <DecisionVolumeChart filters={filters} />

            <CycleTimeHistogram filters={filters} />

            {/* Anomaly Feed — unchanged */}
            <div style={{ height: "360px" }}>
              <AnomalyFeed anomalies={anomalies} onAcknowledge={handleAcknowledge} />
            </div>

          </div>

          {/* Compliance Trend — full width */}
          <ComplianceTrendChart filters={filters} />

          {/* Risk Heatmap placeholder (Day 9) */}
          <div style={{ background:"white", borderRadius:"14px", padding:"20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <div>
                <h2 style={{ fontSize:"14px", fontWeight:700, color:"#1E293B", margin:0 }}>Departmental Risk Heatmap</h2>
                <p style={{ fontSize:"12px", color:"#94A3B8", margin:"2px 0 0" }}>Risk concentration by category — available Day 9</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <span style={{ fontSize:"11px", color:"#94A3B8" }}>Low</span>
                {["#D1FAE5","#A7F3D0","#FDE68A","#FCA5A5","#F87171","#EF4444"].map((c,i) => (
                  <div key={i} style={{ width:"20px", height:"12px", background:c, borderRadius:"3px" }} />
                ))}
                <span style={{ fontSize:"11px", color:"#94A3B8" }}>High</span>
              </div>
            </div>

            {!heatmapReady ? (
              <div style={{ height:"200px", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"8px", textAlign:"center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.8} width="40" height="40">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="9" y1="10" x2="9" y2="21" />
                  <line x1="15" y1="10" x2="15" y2="21" />
                </svg>
                <p style={{ fontSize:"13px", color:"#94A3B8", margin:0 }}>Data not available</p>
              </div>
            ) : null}

            {/* TODO: Day 9 - uncomment when /api/analytics/risk-heatmap endpoint is live */}
            {/*
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:"4px", fontFamily:"'Outfit',sans-serif" }}>
                <thead>
                  <tr>
                    <th style={{ width:"120px" }} />
                    {["Operational","Financial","Compliance","Strategic","Cyber"].map(h => (
                      <th key={h} style={{ fontSize:"11px", color:"#94A3B8", fontWeight:600, padding:"4px 8px", textAlign:"center" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { dept:"IT",         vals:[1.2,2.4,4.5,1.8,8.9] },
                    { dept:"Finance",    vals:[1.5,6.7,5.2,2.1,1.1] },
                    { dept:"Operations", vals:[5.5,2.8,1.9,4.1,2.5] },
                    { dept:"Legal",      vals:[1.0,1.3,6.2,2.9,1.4] }
                  ].map(row => (
                    <tr key={row.dept}>
                      <td style={{ fontSize:"12px", color:"#374151", fontWeight:600, padding:"4px 8px" }}>{row.dept}</td>
                      {row.vals.map((v,i) => {
                        const bg = v > 7 ? "#FCA5A5" : v > 5 ? "#FDE68A" : v > 3 ? "#A7F3D0" : "#D1FAE5"
                        return (
                          <td key={i} style={{ background:bg, borderRadius:"8px", textAlign:"center", padding:"10px 6px", fontSize:"13px", fontWeight:700, color:"#1E293B", cursor:"pointer", transition:"transform 0.15s", minWidth:"80px" }}>
                            {v}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            */}
          </div>

        </main>
      </div>
    </div>
  )
}
