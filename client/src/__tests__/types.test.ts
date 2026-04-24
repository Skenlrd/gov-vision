import { describe, it, expect } from 'vitest'
import type { 
  IKpiSummary, 
  IAnomaly, 
  Severity,
  RiskLevel,
  IForecastData,
  IReportConfig 
} from '../../contracts'

describe('Shared Type Contracts', () => {
  it('should validate IKpiSummary structure', () => {
    const kpi: IKpiSummary = {
      department: 'OP001',
      snapshotDate: '2026-04-22',
      totalDecisions: 100,
      approvedCount: 80,
      rejectedCount: 15,
      pendingCount: 5,
      avgCycleTimeHours: 24,
      violationCount: 2,
      openViolations: 1,
      complianceRate: 0.95,
      riskScore: 75,
      riskLevel: 'Medium'
    }
    
    expect(kpi.complianceRate).toBeGreaterThanOrEqual(0)
    expect(kpi.complianceRate).toBeLessThanOrEqual(1)
    expect(kpi.riskLevel).toBeOneOf(['Low', 'Medium', 'High', 'Critical'] as RiskLevel[])
  })

  it('should validate IAnomaly structure', () => {
    const anomaly: IAnomaly = {
      _id: 'test-id',
      decisionId: 'dec-123',
      department: 'OP001',
      anomalyScore: 0.85,
      severity: 'High',
      description: 'Cycle time exceeds threshold',
      isAcknowledged: false,
      detectedAt: '2026-04-22T10:00:00Z'
    }
    
    expect(anomaly.anomalyScore).toBeGreaterThanOrEqual(0)
    expect(anomaly.anomalyScore).toBeLessThanOrEqual(1)
    expect(anomaly.severity).toBeOneOf(['Low', 'Medium', 'High', 'Critical', 'Normal'] as Severity[])
  })

  it('should validate Severity type values', () => {
    const validSeverities: Severity[] = ['Low', 'Medium', 'High', 'Critical', 'Normal']
    validSeverities.forEach(severity => {
      expect(typeof severity).toBe('string')
    })
  })
})

describe('Forecast Data Contracts', () => {
  it('should validate IForecastData structure', () => {
    const forecast: IForecastData = {
      department: 'OP001',
      target: 'volume',
      horizon: 30,
      generatedAt: '2026-04-22T10:00:00Z',
      forecastData: [
        { ds: '2026-04-23', yhat: 10, yhat_lower: 8, yhat_upper: 12 },
        { ds: '2026-04-24', yhat: 15, yhat_lower: 12, yhat_upper: 18 }
      ]
    }
    
    expect(forecast.forecastData).toHaveLength(2)
    expect(forecast.horizon).toBeGreaterThan(0)
  })
})

describe('Report Configuration Contracts', () => {
  it('should validate IReportConfig structure', () => {
    const config: IReportConfig = {
      type: 'compliance',
      format: 'pdf',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-22',
      departments: ['OP001', 'FI001']
    }
    
    expect(config.departments).toHaveLength(2)
    expect(config.format).toBeOneOf(['csv', 'excel', 'pdf'])
  })
})
