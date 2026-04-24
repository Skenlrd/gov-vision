/*
  Frontend TypeScript types for GovVision.
  
  NOTE: Shared API contracts are now in /contracts/index.ts
  and re-exported here for convenience. Frontend-specific types
  are defined locally in this file.
  
  Import from contracts for shared types:
  import { IKpiSummary, IAnomaly, Severity } from '../../../contracts'
*/

// Re-export all shared types from contracts

export type {
  Severity,
  RiskLevel,
  IKpiSummary,
  IAnomaly,
  IAnomalyResult,
  IFeatureValues,
  IAnomalyGroup,
  IRiskEntry,
  IRiskHeatmapRow,
  ForecastTarget,
  IForecastPoint,
  IForecastData,
  ReportFormat,
  ReportType,
  ReportStatus,
  IReportConfig,
  IGenerateReportResponse,
  IReportRecord,
  IReportSchedule,
  IFilter,
  IDecisionVolumePoint,
  ICycleTimeBucket,
  IComplianceTrendPoint,
  IComplianceTrendSeries,
  IFeatureImportance,
  IUser
} from '../../../contracts/index.ts'

export { RISK_LEVEL_COLORS } from '../../../contracts/index.ts'

// Frontend-specific types (UI state, component props, etc.)
// NOTE: Shared types (IKpiSummary, IAnomaly, etc.) are re-exported from contracts above

// UI-specific theme/styling (not shared with backend)
export const RISK_LEVEL_THEME: Record<import('../../../contracts').RiskLevel, {
  fill: string
  text: string
  bg: string
  border: string
}> = {
  Low: {
    fill: "#57B877",
    text: "#2E7D32",
    bg: "#DDF3E5",
    border: "#9FD7AF"
  },
  Medium: {
    fill: "#FFC107",
    text: "#8A6A00",
    bg: "#FFF6CC",
    border: "#F2D979"
  },
  High: {
    fill: "#E08C3E",
    text: "#9C4A00",
    bg: "#FDE9D6",
    border: "#E9BC92"
  },
  Critical: {
    fill: "#DE6D6D",
    text: "#9C2F2F",
    bg: "#FADDDD",
    border: "#E8A9A9"
  }
}

// UI-specific types (not shared with backend)

export interface IReport {
  _id: string
  name: string
  type: string
  format: "pdf" | "excel" | "csv"
  status: "pending" | "generating" | "completed" | "failed"
  createdAt: string
}

// Component prop types
export interface KPICardProps {
  title: string
  value: number
  trend?: number
  suffix?: string
  icon?: React.ReactNode
}

export interface ChartContainerProps {
  title: string
  children: React.ReactNode
  className?: string
}
