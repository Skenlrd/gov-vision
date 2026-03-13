import { Routes, Route } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import Sidebar from "./components/Sidebar"

/*
  Layout wraps every page with the fixed sidebar.
  Additional pages (AI Insights, Risk Heatmap, Reports)
  are added as more routes here on Day 8–10.
*/
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={
        <Layout>
          <Dashboard />
        </Layout>
      } />
      <Route path="/dashboard" element={
        <Layout>
          <Dashboard />
        </Layout>
      } />
      {/* Day 8 — AI Insights */}
      {/* <Route path="/ai-insights" element={<Layout><AIInsights /></Layout>} /> */}
      {/* Day 9 — Risk Heatmap */}
      {/* <Route path="/risk" element={<Layout><RiskHeatmap /></Layout>} /> */}
      {/* Day 10 — Reports */}
      {/* <Route path="/reports" element={<Layout><Reports /></Layout>} /> */}
    </Routes>
  )
}
