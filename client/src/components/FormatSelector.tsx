import type { ReportFormat } from "../types";

interface FormatSelectorProps {
  selected: ReportFormat;
  onChange: (format: ReportFormat) => void;
}

const formats: Array<{
  value: ReportFormat;
  label: string;
  description: string;
  icon: JSX.Element;
  iconColor: string;
}> = [
  {
    value: "csv",
    label: "CSV",
    description: "Plain text, opens in Excel/Sheets",
    iconColor: "text-blue-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="8" y1="13" x2="16" y2="13"></line>
        <line x1="8" y1="17" x2="16" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    )
  },
  {
    value: "excel",
    label: "Excel",
    description: "2 sheets: KPI summary + anomalies",
    iconColor: "text-green-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M8 13h2v4H8z"></path>
        <path d="M14 13h2v4h-2z"></path>
        <path d="M8 17h8"></path>
        <path d="M8 13h8"></path>
      </svg>
    )
  },
  {
    value: "pdf",
    label: "PDF",
    description: "Formatted with cover page + table",
    iconColor: "text-red-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="M10 18v-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2"></path>
      </svg>
    )
  },
];

export default function FormatSelector({
  selected,
  onChange,
}: FormatSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      {formats.map((f) => (
        <label
          key={f.value}
          className={`flex items-start gap-3 cursor-pointer border rounded-xl p-4 transition-all ${
            selected === f.value
              ? "border-gray-700 bg-gray-50 shadow-sm"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input
            type="radio"
            name="format"
            value={f.value}
            checked={selected === f.value}
            onChange={() => onChange(f.value)}
            className="accent-gray-800 mt-1"
          />
          <div className={`mt-0.5 ${f.iconColor}`}>
            {f.icon}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-800">
              {f.label}
            </span>
            <span className="text-xs text-gray-500 leading-snug mt-0.5">{f.description}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
