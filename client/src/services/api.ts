import axios from "axios"
import type {
  IKpiSummary,
  IAnomaly,
  IFilter,
  IDecisionVolumePoint,
  ICycleTimeBucket,
  IComplianceTrendSeries,
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

/*
  JWT interceptor.
  Runs before EVERY request automatically.
  Reads the token from localStorage and adds it
  to the Authorization header.
  You never manually add headers in individual calls.
*/
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token")

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
  return res.data.data
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
  return res.data.data
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
  return res.data.data
}

export const getCycleTimeHistogram = async (
  filters: IFilter
): Promise<ICycleTimeBucket[]> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  }

  const res = await api.get("/api/analytics/cycle-time-histogram", { params })
  return res.data.data
}

export const getComplianceTrend = async (
  filters: IFilter
): Promise<IComplianceTrendSeries[]> => {
  const params: Record<string, string> = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  }

  if (filters.deptId) params.deptId = filters.deptId

  const res = await api.get("/api/analytics/compliance-trend", { params })
  return res.data.data
}

// Anomalies

export const getAnomalies = async (): Promise<IAnomaly[]> => {
  const res = await api.get("/api/ai/anomalies")
  return res.data.data ?? []
}

export const acknowledgeAnomaly = async (id: string): Promise<IAnomaly> => {
  const res = await api.put(`/api/ai/anomalies/${id}/acknowledge`)
  return res.data.data
}

// Reports

export const getReportHistory = async (): Promise<IReport[]> => {
  const res = await api.get("/api/reports/history")
  return res.data.data ?? []
}
