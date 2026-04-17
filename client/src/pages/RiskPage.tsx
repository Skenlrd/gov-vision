import React, { useState, useEffect } from 'react';
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

export default function RiskPage() {
  const [data, setData] = useState<RiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<'All' | RiskLevel>('All');
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

  // Apply level filter
  const filteredData = levelFilter === 'All'
    ? data
    : data.filter((row) => row.riskLevel === levelFilter);

  // Summary counts for the header stat cards
  const counts = {
    Critical: data.filter((r) => r.riskLevel === 'Critical').length,
    High: data.filter((r) => r.riskLevel === 'High').length,
    Medium: data.filter((r) => r.riskLevel === 'Medium').length,
    Low: data.filter((r) => r.riskLevel === 'Low').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Risk Score Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Random Forest risk classification updated daily at 01:00. Click any department for feature breakdown.
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Filter by level:</span>
          {LEVEL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                levelFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
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
