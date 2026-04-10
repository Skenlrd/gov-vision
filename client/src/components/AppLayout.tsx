import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"

export default function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA" }}>
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />
      <div
        style={{
          marginLeft: isSidebarCollapsed ? "74px" : "220px",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          transition: "margin-left 0.2s ease"
        }}
      >
        <TopBar />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}