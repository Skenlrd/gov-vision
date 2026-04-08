import axios from "axios"
import type {
  IKpiSummary,
  IAnomaly,
  IAnomalyGroup,
  IFilter,
  IDecisionVolumePoint,
  ICycleTimeBucket,
  IComplianceTrendSeries,
  IRiskHeatmapRow,
  IReport
} from "../types"

/*
  ONE Axios instance for the entire frontend.
  Base URL points to Module 3 backend.
  If the port changes, update it here only.
*/
const apiHost = window.location.hostname || "localhost"
const apiProtocol = window.location.protocol
const apiPort = import.meta.env.VITE_API_PORT || "5002"
const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || `${apiProtocol}//${apiHost}:${apiPort}`

const api = axios.create({
  baseURL: apiBaseUrl
})

function unwrap<T>(payload: any): T {
  // Supports both direct JSON responses and { data: ... } wrappers.
  return (payload && typeof payload === "object" && "data" in payload)
    ? (payload.data as T)
    : (payload as T)
}

/*
  JWT interceptor.
  Runs before EVERY request automatically.
  Reads the token from localStorage and adds it
  to the Authorization header.
  You never manually add headers in individual calls.
*/
api.interceptors.request.use(config => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("govvision_token") ||
    localStorage.getItem("jwt")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// KPI

export const getKpiSummary = async (filters: IFilter): Promise<IKpiSummary> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  }

  const res = await api.get("/api/analytics/kpi-summary", { params })
  return unwrap<IKpiSummary>(res.data)
}

export const getDeptKpiSummary = async (
  deptId: string,
  filters: IFilter
): Promise<IKpiSummary> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  }

  const encodedDept = encodeURIComponent(deptId)
  const res = await api.get(`/api/analytics/kpi-summary/${encodedDept}`, { params })
  return unwrap<IKpiSummary>(res.data)
}

// Charts

export const getDecisionVolume = async (
  filters: IFilter,
  granularity: string = "daily"
): Promise<IDecisionVolumePoint[]> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    granularity
  }

  if (filters.deptId) params.deptId = filters.deptId

  const res = await api.get("/api/analytics/decision-volume", { params })
  return unwrap<IDecisionVolumePoint[]>(res.data)
}

export const getCycleTimeHistogram = async (
  filters: IFilter
): Promise<ICycleTimeBucket[]> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  }

  const res = await api.get("/api/analytics/cycle-time-histogram", { params })
  return unwrap<ICycleTimeBucket[]>(res.data)
}

export const getComplianceTrend = async (
  filters: IFilter,
  granularity: "daily" | "weekly" | "monthly" = "daily"
): Promise<IComplianceTrendSeries[]> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    granularity
  }

  if (filters.deptId) params.deptId = filters.deptId

  const res = await api.get("/api/analytics/compliance-trend", { params })
  return unwrap<IComplianceTrendSeries[]>(res.data)
}

export const getRiskHeatmap = async (
  filters: Pick<IFilter, "dateFrom" | "dateTo">
): Promise<IRiskHeatmapRow[]> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  }

  const res = await api.get("/api/analytics/risk-heatmap", { params })
  const data = unwrap<IRiskHeatmapRow[]>(res.data)
  return Array.isArray(data) ? data : []
}

// Anomalies

export const getAnomalies = async (): Promise<IAnomaly[]> => {
  const res = await api.get("/api/ai/anomalies")
  const data = unwrap<IAnomaly[] | IAnomalyGroup | { total?: number }>(res.data)
  if (Array.isArray(data)) return data

  if (data && typeof data === "object") {
    const grouped = data as Partial<IAnomalyGroup>
    return [
      ...(Array.isArray(grouped.Critical) ? grouped.Critical : []),
      ...(Array.isArray(grouped.High) ? grouped.High : []),
      ...(Array.isArray(grouped.Medium) ? grouped.Medium : []),
      ...(Array.isArray(grouped.Low) ? grouped.Low : [])
    ]
  }

  return []
}

export const getAnomalyGroups = async (): Promise<IAnomalyGroup> => {
  const res = await api.get("/api/ai/anomalies")
  const data = unwrap<IAnomalyGroup | IAnomaly[]>(res.data)

  if (Array.isArray(data)) {
    const groups: IAnomalyGroup = {
      Critical: [],
      High: [],
      Medium: [],
      Low: [],
      total: data.length
    }

    for (const anomaly of data) {
      if (anomaly.severity === "Critical") groups.Critical.push(anomaly)
      else if (anomaly.severity === "High") groups.High.push(anomaly)
      else if (anomaly.severity === "Medium") groups.Medium.push(anomaly)
      else if (anomaly.severity === "Low") groups.Low.push(anomaly)
    }

    return groups
  }

  return {
    Critical: Array.isArray(data?.Critical) ? data.Critical : [],
    High: Array.isArray(data?.High) ? data.High : [],
    Medium: Array.isArray(data?.Medium) ? data.Medium : [],
    Low: Array.isArray(data?.Low) ? data.Low : [],
    total: typeof data?.total === "number"
      ? data.total
      : (
        (Array.isArray(data?.Critical) ? data.Critical.length : 0) +
        (Array.isArray(data?.High) ? data.High.length : 0) +
        (Array.isArray(data?.Medium) ? data.Medium.length : 0) +
        (Array.isArray(data?.Low) ? data.Low.length : 0)
      )
  }
}

export const acknowledgeAnomaly = async (id: string): Promise<IAnomaly> => {
  const res = await api.put(`/api/ai/anomalies/${id}/acknowledge`)
  return unwrap<IAnomaly>(res.data)
}

// Reports

export const getReportHistory = async (): Promise<IReport[]> => {
  const res = await api.get("/api/reports/history")
  const data = unwrap<IReport[]>(res.data)
  return Array.isArray(data) ? data : []
}
