import type { RiskLevel } from "../types"
import { RISK_LEVEL_COLORS, RISK_LEVEL_THEME } from "../types"

interface Props {
  level: RiskLevel
  size?: "sm" | "md"
}

export default function RiskLevelBadge({ level, size = "md" }: Props) {
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"
  const theme = RISK_LEVEL_THEME[level]

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${sizeClass}`}
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        borderColor: theme.border
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block rounded-full"
        style={{ width: 7, height: 7, backgroundColor: RISK_LEVEL_COLORS[level] }}
      />
      {level}
    </span>
  )
}
