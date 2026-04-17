type HorizonToggleProps = {
  selected: 7 | 14 | 30
  onChange: (horizon: 7 | 14 | 30) => void
}

const HORIZONS = [7, 14, 30] as const

export default function HorizonToggle({ selected, onChange }: HorizonToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-[#D8DEE9] bg-[#F8FAFC] p-1">
      {HORIZONS.map(horizon => {
        const active = selected === horizon

        return (
          <button
            key={horizon}
            type="button"
            onClick={() => onChange(horizon)}
            className="rounded-full px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              background: active ? "linear-gradient(135deg, #4B5563, #374151)" : "transparent",
              color: active ? "#F9FAFB" : "#334155",
              boxShadow: active ? "0 8px 16px rgba(51,65,85,0.18)" : "none"
            }}
          >
            {horizon}d
          </button>
        )
      })}
    </div>
  )
}