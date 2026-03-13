interface TopBarProps {
  isLive: boolean
  anomalyCount: number
  openViolations: number
}

export default function TopBar({ isLive, anomalyCount, openViolations }: TopBarProps) {
  const alertCount = anomalyCount + openViolations

  return (
    <header style={{
      height: "60px",
      background: "white",
      borderBottom: "1px solid #E8EDF5",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      position: "sticky",
      top: 0,
      zIndex: 40,
      boxShadow: "0 1px 8px rgba(0,0,0,0.04)"
    }}>
      <div />

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Notification bell */}
        <button style={{
          width: "38px", height: "38px",
          borderRadius: "10px",
          background: "#F4F7FF",
          border: "1px solid #E2E8F4",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s"
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2} width="17" height="17">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {alertCount > 0 && (
            <span style={{
              position: "absolute",
              top: "6px", right: "6px",
              width: "8px", height: "8px",
              borderRadius: "50%",
              background: "#EF4444",
              border: "1.5px solid white"
            }} />
          )}
        </button>

        {/* Divider */}
        <div style={{ width: "1px", height: "24px", background: "#E2E8F4", margin: "0 4px" }} />

        {/* Avatar */}
        <div
          title="Aswin Chettri"
          style={{
          width: "36px", height: "36px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'Outfit', sans-serif",
          boxShadow: "0 2px 8px rgba(59,130,246,0.3)"
        }}>
          AC
        </div>
      </div>
    </header>
  )
}
