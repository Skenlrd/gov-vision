import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"

export default function AppLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA" }}>
      <Sidebar />
      <main style={{ marginLeft: "220px", minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}