import { Navigate, Route, Routes } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import DeepInsights from "./pages/DeepInsights"
import ForecastPage from "./pages/ForecastPage"
import RiskPage from "./pages/RiskPage"
import ReportBuilder from "./pages/ReportBuilder"
import ReportHistory from "./pages/ReportHistory"
import ReportSchedules from "./pages/ReportSchedules"
import AppLayout from "./components/AppLayout"
import PlaceholderPage from "./pages/PlaceholderPage"

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/deep-insights" element={<DeepInsights />} />
        <Route path="/anomaly" element={<PlaceholderPage title="Anomaly Detection" />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/analytics/forecast" element={<ForecastPage />} />
        <Route path="/risk" element={<RiskPage />} />
        <Route path="/reports/builder" element={<ReportBuilder />} />
        <Route path="/reports/history" element={<ReportHistory />} />
        <Route path="/reports/schedules" element={<ReportSchedules />} />
        <Route path="/reports" element={<Navigate to="/reports/builder" replace />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="/support" element={<PlaceholderPage title="Support" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
