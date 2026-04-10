import { Navigate, Route, Routes } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import DeepInsights from "./pages/DeepInsights"
import ForecastPage from "./pages/ForecastPage"
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
        <Route path="/risk" element={<PlaceholderPage title="Risk Assessment" />} />
        <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="/support" element={<PlaceholderPage title="Support" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
