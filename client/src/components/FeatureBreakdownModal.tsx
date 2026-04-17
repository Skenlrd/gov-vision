import type { RiskEntry } from "../types"
import RiskLevelBadge from "./RiskLevelBadge"

interface Props {
  entry: RiskEntry | null
  onClose: () => void
}

const FEATURE_LABELS: Record<string, string> = {
  violationCount: "Violation Count",
  openViolationRate: "Open Violation Rate",
  avgCompositeRisk: "Avg Composite Risk",
  overdueCount: "Overdue Decision Count",
  complianceRate: "Compliance Rate",
  policyBreachFreq: "Policy Breach Frequency",
  escalationCount: "Escalation Count"
}

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff"]

export default function FeatureBreakdownModal({ entry, onClose }: Props) {
  if (!entry) return null

  const features = entry.featureImportance
    ? Object.entries(entry.featureImportance)
        .map(([key, value]) => ({
          name: FEATURE_LABELS[key] || key,
          importance: value,
          percentage: (value * 100).toFixed(1)
        }))
        .sort((a, b) => b.importance - a.importance)
    : []

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{entry.department}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Risk Score: {entry.riskScore.toFixed(1)} / 100</p>
          </div>
          <div className="flex items-center gap-3">
            <RiskLevelBadge level={entry.riskLevel} />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light"
            >
              x
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Feature Importance (what drove this risk score)
          </h3>
          {features.length > 0 ? (
            features.map((feature, index) => (
              <div key={feature.name} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{feature.name}</span>
                  <span className="font-mono">{feature.percentage}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${feature.percentage}%`,
                      backgroundColor: BAR_COLORS[index % BAR_COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              Feature importance data not available. Re-run the risk scoring job.
            </p>
          )}
        </div>

        <div className="px-5 pb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Historical risk level distribution</h3>
          <div className="grid grid-cols-4 gap-2">
            {(["Low", "Medium", "High", "Critical"] as const).map(level => (
              <div key={level} className="text-center bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-bold text-gray-800">{entry[level] ?? 0}</div>
                <RiskLevelBadge level={level} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
