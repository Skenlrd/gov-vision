import { useState, useEffect, useRef } from 'react';
import { getRiskHeatmap } from '../services/api';
import type { RiskEntry, RiskLevel } from '../types';
import RiskTable from '../components/RiskTable';
import RiskPieChart from '../components/RiskPieChart';
import RiskLevelBadge from '../components/RiskLevelBadge';
import FeatureBreakdownModal from '../components/FeatureBreakdownModal';
import SkeletonLoader from '../components/SkeletonLoader';

// Filter options for the level filter dropdown
const LEVEL_FILTERS: Array<'All' | RiskLevel> = ['All', 'Critical', 'High', 'Medium', 'Low'];

function normalizeRiskLevel(level: string | undefined): RiskLevel {
  const value = String(level || 'Low').toLowerCase();
  if (value === 'critical') return 'Critical';
  if (value === 'high') return 'High';
  if (value === 'medium') return 'Medium';
  return 'Low';
}

type DropdownOption = {
  label: string
  value: string
}

function AccentDropdown({
  value,
  options,
  onChange,
  width = "190px"
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
          padding: "8px 12px",
          borderRadius: "9px",
          border: open ? "1px solid var(--accent-600)" : "1px solid #E2E8F0",
          background: "white",
          fontSize: "13px",
          fontWeight: 500,
          color: "#334155",
          fontFamily: "inherit",
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
                  fontFamily: "inherit",
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

export default function RiskPage() {
  const [data, setData] = useState<RiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<'All' | RiskLevel>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [selectedEntry, setSelectedEntry] = useState<RiskEntry | null>(null); // For modal

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await getRiskHeatmap();
        const normalized: RiskEntry[] = rows.map((row: any) => ({
          departmentId: row.departmentId || row.deptId || row.department || 'unknown',
          department: row.department || row.departmentId || row.deptId || 'Unknown',
          riskScore: Number(row.riskScore ?? 0),
          riskLevel: normalizeRiskLevel(row.riskLevel),
          Low: Number(row.Low ?? row.low ?? 0),
          Medium: Number(row.Medium ?? row.medium ?? 0),
          High: Number(row.High ?? row.high ?? 0),
          Critical: Number(row.Critical ?? row.critical ?? 0),
          featureImportance: row.featureImportance || undefined,
        }));
        setData(normalized);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load risk data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter options
  const departmentOptions = Array.from(new Set(data.map(d => d.department)))
    .filter(d => d !== "Organization Wide")
    .sort();

  // Apply filters
  const filteredData = data.filter((row) => {
    const levelMatch = levelFilter === 'All' || row.riskLevel === levelFilter;
    const deptMatch = deptFilter === 'All' || row.department === deptFilter;
    return levelMatch && deptMatch;
  });

  // Summary counts for the header stat cards (exclude organization wide aggregate)
  const dataForCounts = data.filter(r => r.department !== "Organization Wide");
  const counts = {
    Critical: dataForCounts.filter((r) => r.riskLevel === 'Critical').length,
    High: dataForCounts.filter((r) => r.riskLevel === 'High').length,
    Medium: dataForCounts.filter((r) => r.riskLevel === 'Medium').length,
    Low: dataForCounts.filter((r) => r.riskLevel === 'Low').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Score Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Risk classification updated daily at 01:00. Click any department for feature breakdown.
        </p>
      </div>

      {/* Summary stat cards */}
      {!loading && !error && (
        <div className="grid grid-cols-4 gap-4">
          {(['Critical', 'High', 'Medium', 'Low'] as const).map((level) => (
            <div
              key={level}
              onClick={() => setLevelFilter(levelFilter === level ? 'All' : level)}
              className="bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="text-3xl font-bold text-gray-900 mb-1">{counts[level]}</div>
              <RiskLevelBadge level={level} />
              <div className="text-xs text-gray-400 mt-1">departments</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter row */}
      {!loading && !error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            background: "#fff",
            border: "1px solid #E6EBF2",
            borderRadius: 12,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            padding: "12px 16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginRight: 2 }}>
              Filter by
            </span>
            <AccentDropdown
              value={levelFilter}
              options={[
                { label: "All severities", value: "All" },
                { label: "Critical", value: "Critical" },
                { label: "High", value: "High" },
                { label: "Medium", value: "Medium" },
                { label: "Low", value: "Low" }
              ]}
              onChange={(val) => setLevelFilter(val as any)}
            />
            <AccentDropdown
              value={deptFilter}
              options={[
                { label: "All departments", value: "All" },
                ...departmentOptions.map(d => ({ label: d, value: d }))
              ]}
              onChange={setDeptFilter}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
              Showing{" "}
              <strong style={{ color: "#0F172A" }}>{filteredData.length}</strong> of{" "}
              {data.length} records
            </span>
            {(levelFilter !== "All" || deptFilter !== "All") && (
              <button
                onClick={() => {
                  setLevelFilter("All")
                  setDeptFilter("All")
                }}
                style={{
                  border: "1px solid #E2E8F0",
                  background: "transparent",
                  color: "#64748B",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  borderRadius: 7,
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading / error / content */}
      {loading && <SkeletonLoader rows={5} />}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table — takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <RiskTable data={filteredData} onRowClick={setSelectedEntry} />
          </div>
          {/* Pie chart — takes 1/3 width */}
          <div>
            <RiskPieChart data={data} />
          </div>
        </div>
      )}

      {/* Feature breakdown modal */}
      <FeatureBreakdownModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
