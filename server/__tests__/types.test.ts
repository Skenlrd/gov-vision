import { IUser, IKpiSummary, IAnomalyResult } from '../types'
import { Severity } from '../../contracts'

describe('Server Types', () => {
  describe('IUser', () => {
    it('should have required fields', () => {
      const user: IUser = {
        userId: 'user-123',
        role: 'admin',
        department: 'OP001'
      }
      
      expect(user.userId).toBeDefined()
      expect(user.role).toBeDefined()
      expect(user.department).toBeDefined()
    })
  })

  describe('IKpiSummary', () => {
    it('should validate with all required fields', () => {
      const kpi: IKpiSummary = {
        department: 'OP001',
        snapshotDate: new Date(),
        totalDecisions: 100,
        approvedCount: 80,
        rejectedCount: 15,
        pendingCount: 5,
        avgCycleTimeHours: 24,
        violationCount: 2,
        openViolations: 1,
        complianceRate: 0.95
      }
      
      expect(kpi.totalDecisions).toBeGreaterThanOrEqual(0)
      expect(kpi.complianceRate).toBeGreaterThanOrEqual(0)
      expect(kpi.complianceRate).toBeLessThanOrEqual(1)
    })

    it('should accept optional risk fields', () => {
      const kpi: IKpiSummary = {
        department: null,
        snapshotDate: new Date(),
        totalDecisions: 50,
        approvedCount: 40,
        rejectedCount: 10,
        pendingCount: 0,
        avgCycleTimeHours: 12,
        violationCount: 0,
        openViolations: 0,
        complianceRate: 1.0,
        riskScore: 25,
        riskLevel: 'low'
      }
      
      expect(kpi.riskScore).toBeDefined()
      expect(kpi.riskLevel).toBeOneOf(['low', 'medium', 'high', 'critical'])
    })
  })

  describe('IAnomalyResult', () => {
    it('should validate anomaly result structure', () => {
      const result: IAnomalyResult = {
        id: 'anomaly-456',
        anomalyScore: 0.75,
        isAnomaly: true,
        severity: 'High'
      }
      
      expect(result.anomalyScore).toBeGreaterThanOrEqual(0)
      expect(result.anomalyScore).toBeLessThanOrEqual(1)
      expect(typeof result.isAnomaly).toBe('boolean')
    })
  })
})
