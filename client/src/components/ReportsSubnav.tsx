import { NavLink } from "react-router-dom"

const REPORT_LINKS = [
  { label: "Builder", to: "/reports/builder" },
  { label: "History", to: "/reports/history" },
  { label: "Schedules", to: "/reports/schedules" }
]

export default function ReportsSubnav() {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
      {REPORT_LINKS.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  )
}
