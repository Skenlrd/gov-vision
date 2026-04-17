import type { RiskEntry } from "../types"
import { RISK_LEVEL_COLORS } from "../types"
import RiskLevelBadge from "./RiskLevelBadge"

interface Props {
  data: RiskEntry[]
  onRowClick: (entry: RiskEntry) => void
}

function scoreColor(score: number): string {
  if (score >= 75) return RISK_LEVEL_COLORS.Critical
  if (score >= 50) return RISK_LEVEL_COLORS.High
  if (score >= 25) return RISK_LEVEL_COLORS.Medium
  return RISK_LEVEL_COLORS.Low
}

export default function RiskTable({ data, onRowClick }: Props) {
  const sorted = [...data].sort((a, b) => b.riskScore - a.riskScore)

  if (sorted.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12 text-sm bg-white rounded-xl border">
        No risk data available. Run the risk scoring job first.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">#</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 w-64">Risk Score</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Level</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, index) => (
            <tr
              key={entry.departmentId}
              className="border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onRowClick(entry)}
            >
              <td className="px-4 py-3 text-gray-400 font-mono">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{entry.department}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-40">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(entry.riskScore, 100)}%`,
                        backgroundColor: scoreColor(entry.riskScore)
                      }}
                    />
                  </div>
                  <span className="text-gray-700 font-mono text-xs w-10">
                    {entry.riskScore.toFixed(1)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <RiskLevelBadge level={entry.riskLevel} />
              </td>
              <td className="px-4 py-3">
                <button className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                  View breakdown -&gt;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
