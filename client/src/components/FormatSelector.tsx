import type { ReportFormat } from "../types"

interface FormatSelectorProps {
  selected: ReportFormat
  onChange: (format: ReportFormat) => void
}

const formats: Array<{ value: ReportFormat; label: string; description: string }> = [
  { value: "csv", label: "CSV", description: "Plain text, opens in Excel/Sheets" },
  { value: "excel", label: "Excel", description: "2 sheets: KPI summary + anomalies" },
  { value: "pdf", label: "PDF", description: "Formatted with cover page + table" },
]

export default function FormatSelector({ selected, onChange }: FormatSelectorProps) {
  return (
    <div className="flex gap-3">
      {formats.map((f) => (
        <label
          key={f.value}
          className={`flex flex-col gap-0.5 cursor-pointer border rounded-xl p-3 flex-1 transition-all ${
            selected === f.value
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="radio"
              name="format"
              value={f.value}
              checked={selected === f.value}
              onChange={() => onChange(f.value)}
              className="accent-indigo-600"
            />
            <span className="font-semibold text-sm text-gray-800">{f.label}</span>
          </div>
          <span className="text-xs text-gray-500 ml-5">{f.description}</span>
        </label>
      ))}
    </div>
  )
}
