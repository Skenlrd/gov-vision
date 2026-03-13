import { NavLink } from "react-router-dom"

const dashboardItem = {
  label: "Dashboard",
  path: "/",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

const reportsItem = {
  label: "Reports",
  path: "/reports",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

const aiFeatureItems = [
  {
    label: "Anomaly Detection",
    path: "/anomaly",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  },
  {
    label: "Forecast",
    path: "/forecast",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="21 12 21 7 16 7" />
      </svg>
    )
  },
  {
    label: "Risk Assessment",
    path: "/risk",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
]

const bottomItems = [
  {
    label: "Settings",
    path: "/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    )
  },
  {
    label: "Support",
    path: "/support",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
]

export default function Sidebar() {
  return (
    <aside style={{
      width: "220px",
      minHeight: "100vh",
      background: "#1A1F2E",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      flexShrink: 0,
      borderRight: "1px solid rgba(255,255,255,0.05)",
      position: "fixed",
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 50,
      overflowY: "auto"
    }}>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.07)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px",
            background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
            borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(59,130,246,0.4)"
          }}>
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.3px", fontFamily: "'Outfit', sans-serif" }}>
              Gov<span style={{ color: "#60A5FA" }}>Vision</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              ENTERPRISE
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        <div style={{ marginBottom: "6px" }}>
          <NavLink
            key={dashboardItem.path}
            to={dashboardItem.path}
            end
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              marginBottom: "2px",
              textDecoration: "none",
              color: isActive ? "white" : "rgba(255,255,255,0.5)",
              background: isActive
                ? "linear-gradient(90deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))"
                : "transparent",
              borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
              transition: "all 0.18s ease",
              fontSize: "13.5px",
              fontWeight: isActive ? 600 : 400,
              fontFamily: "'Outfit', sans-serif"
            })}
          >
            {dashboardItem.icon}
            {dashboardItem.label}
          </NavLink>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", color: "rgba(255,255,255,0.75)", fontSize: "13.5px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            Deep Insights
          </div>

          {aiFeatureItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px 10px 20px",
                borderRadius: "10px",
                marginBottom: "2px",
                textDecoration: "none",
                color: isActive ? "white" : "rgba(255,255,255,0.5)",
                background: isActive
                  ? "linear-gradient(90deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))"
                  : "transparent",
                borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
                transition: "all 0.18s ease",
                fontSize: "13.5px",
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Outfit', sans-serif"
              })}
            >
              {item.icon}
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{item.label}</span>
                {item.badge ? (
                  <span title={item.badgeTitle} style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                    {item.badge}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ))}

          <NavLink
            key={reportsItem.path}
            to={reportsItem.path}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "10px",
              marginBottom: "2px",
              textDecoration: "none",
              color: isActive ? "white" : "rgba(255,255,255,0.5)",
              background: isActive
                ? "linear-gradient(90deg, rgba(59,130,246,0.25), rgba(59,130,246,0.08))"
                : "transparent",
              borderLeft: isActive ? "3px solid #3B82F6" : "3px solid transparent",
              transition: "all 0.18s ease",
              fontSize: "13.5px",
              fontWeight: isActive ? 600 : 400,
              fontFamily: "'Outfit', sans-serif"
            })}
          >
            {reportsItem.icon}
            {reportsItem.label}
          </NavLink>
        </div>
      </nav>

      {/* New Report Button */}
      <div style={{ padding: "0 10px 12px" }}>
        <button
          title="Generate formatted PDF or Excel report"
          style={{
          width: "100%",
          padding: "10px",
          background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
          border: "none",
          borderRadius: "10px",
          color: "white",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          fontFamily: "'Outfit', sans-serif",
          boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
          transition: "all 0.2s ease"
        }}>
          <span style={{ fontSize: "16px" }}>+</span> New Report
        </button>
      </div>

      {/* Bottom Items */}
      <div style={{
        padding: "10px 10px 20px",
        borderTop: "1px solid rgba(255,255,255,0.07)"
      }}>
        {bottomItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "9px 12px",
              borderRadius: "10px",
              marginBottom: "2px",
              textDecoration: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: "13px",
              fontFamily: "'Outfit', sans-serif",
              transition: "color 0.18s"
            }}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
