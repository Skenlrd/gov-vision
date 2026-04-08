import { useState } from "react"
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
    label: "Deep Insights",
    path: "/deep-insights",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    )
  },
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
  const [isNewReportHovered, setIsNewReportHovered] = useState(false)
  const [isNewReportFocused, setIsNewReportFocused] = useState(false)

  return (
    <aside style={{
      width: "220px",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #222733 0%, #1B202A 100%)",
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
      {/* Subtle texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: [
            "radial-gradient(rgba(255,255,255,0.045) 0.6px, transparent 0.6px)",
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 6px)"
          ].join(", "),
          backgroundSize: "4px 4px, 12px 12px",
          opacity: 0.32,
          zIndex: 0
        }}
      />

      {/* Brand */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
        zIndex: 1
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: "21px", letterSpacing: "-0.3px", fontFamily: "'Outfit', sans-serif" }}>
            GovVision
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: "12px 10px", position: "relative", zIndex: 1 }}>
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
                ? "linear-gradient(90deg, rgba(159,136,109,0.72), rgba(137,115,92,0.62))"
                : "transparent",
              borderLeft: isActive ? "3px solid rgba(214,194,166,0.85)" : "3px solid transparent",
              transition: "all 0.18s ease",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 400,
              fontFamily: "'Outfit', sans-serif"
            })}
          >
            {dashboardItem.icon}
            {dashboardItem.label}
          </NavLink>

          {aiFeatureItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
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
                  ? "linear-gradient(90deg, rgba(159,136,109,0.72), rgba(137,115,92,0.62))"
                  : "transparent",
                borderLeft: isActive ? "3px solid rgba(214,194,166,0.85)" : "3px solid transparent",
                transition: "all 0.18s ease",
                fontSize: "12.8px",
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Outfit', sans-serif"
              })}
            >
              {item.icon}
              <span>{item.label}</span>
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
                ? "linear-gradient(90deg, rgba(159,136,109,0.72), rgba(137,115,92,0.62))"
                : "transparent",
              borderLeft: isActive ? "3px solid rgba(214,194,166,0.85)" : "3px solid transparent",
              transition: "all 0.18s ease",
              fontSize: "13px",
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
      <div style={{ padding: "0 10px 12px", position: "relative", zIndex: 1 }}>
        <button
          title="Generate formatted PDF or Excel report"
          onMouseEnter={() => setIsNewReportHovered(true)}
          onMouseLeave={() => setIsNewReportHovered(false)}
          onFocus={() => setIsNewReportFocused(true)}
          onBlur={() => setIsNewReportFocused(false)}
          style={{
          width: "100%",
          padding: "10px",
          background: (isNewReportHovered || isNewReportFocused)
            ? "linear-gradient(135deg, #B0895A, #8F6B42)"
            : "rgba(255,255,255,0.06)",
          border: (isNewReportHovered || isNewReportFocused)
            ? "1px solid rgba(216,190,150,0.60)"
            : "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          color: (isNewReportHovered || isNewReportFocused)
            ? "#FFF8ED"
            : "rgba(255,255,255,0.92)",
          fontSize: "12.6px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          fontFamily: "'Outfit', sans-serif",
          boxShadow: (isNewReportHovered || isNewReportFocused)
            ? "0 6px 14px rgba(176,137,90,0.28)"
            : "none",
          transform: (isNewReportHovered || isNewReportFocused) ? "translateY(-1px)" : "translateY(0)",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          transition: "all 0.2s ease"
        }}>
          <span style={{ fontSize: "15px" }}>+</span> New Report
        </button>
      </div>

      {/* Bottom Items */}
      <div style={{
        padding: "10px 10px 20px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
        zIndex: 1
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
              fontSize: "12.4px",
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
