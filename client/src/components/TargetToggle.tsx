import type { ForecastTarget } from "../types"

type TargetToggleProps = {
  selected: ForecastTarget
  onChange: (target: ForecastTarget) => void
}

const TARGETS: Array<{ label: string; value: ForecastTarget }> = [
  { label: "Decision Volume", value: "volume" },
  { label: "Approval Delay", value: "delay" },
  { label: "Approval Rate", value: "approval_rate" },
  { label: "Rejection Rate", value: "rejection_rate" },
  { label: "Pending Workload", value: "pending_workload" },
  { label: "SLA Misses", value: "sla_misses" }
]

export default function TargetToggle({ selected, onChange }: TargetToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-[#D8DEE9] bg-[#F8FAFC] p-1">
      {TARGETS.map(target => {
        const active = selected === target.value

        return (
          <button
            key={target.value}
            type="button"
            onClick={() => onChange(target.value)}
            className="rounded-full px-4 py-1.5 text-xs font-bold transition-all"
            style={{
              background: active ? "linear-gradient(135deg, #4B5563, #374151)" : "transparent",
              color: active ? "#F9FAFB" : "#334155",
              boxShadow: active ? "0 8px 16px rgba(51,65,85,0.18)" : "none"
            }}
          >
            {target.label}
          </button>
        )
      })}
    </div>
  )
}