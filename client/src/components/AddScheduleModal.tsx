import { useState } from "react"
import { createSchedule } from "../services/api"
import type { ReportSchedule } from "../types"

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (schedule: ReportSchedule) => void
}

export default function AddScheduleModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("")
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [reportType, setReportType] = useState("executive_summary")
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("csv")
  const [dateRange, setDateRange] = useState<"last_7_days" | "last_30_days" | "last_90_days">("last_30_days")
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const created = await createSchedule({
        name,
        frequency,
        reportConfig: { type: reportType, format, departments: [], dateRangeMode: dateRange },
      })
      onCreated(created)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">New Scheduled Report</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Schedule Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly Finance Summary"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "daily" | "weekly" | "monthly")}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as "csv" | "excel" | "pdf")}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="executive_summary">Executive Summary</option>
            <option value="compliance">Compliance Report</option>
            <option value="anomaly">Anomaly Report</option>
            <option value="risk">Risk Report</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Date Range (for each run)</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as "last_7_days" | "last_30_days" | "last_90_days")}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="last_7_days">Last 7 days</option>
            <option value="last_30_days">Last 30 days</option>
            <option value="last_90_days">Last 90 days</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="flex-1 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            {loading ? "Creating..." : "Create Schedule"}
          </button>
        </div>
      </div>
    </div>
  )
}
