import { MLService } from '../../services/mlService'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('MLService', () => {
  const mlServiceUrl = 'http://localhost:8000'

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ML_SERVICE_URL = mlServiceUrl
  })

  describe('getHealth', () => {
    it('should return health status when ML service is up', async () => {
      mockedAxios.get.mockResolvedValue({ 
        data: { status: 'healthy', models_loaded: true } 
      })

      const result = await MLService.getHealth()

      expect(mockedAxios.get).toHaveBeenCalledWith(`${mlServiceUrl}/health`)
      expect(result.status).toBe('healthy')
    })

    it('should throw error when ML service is unreachable', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'))

      await expect(MLService.getHealth()).rejects.toThrow()
    })
  })

  describe('predictAnomalies', () => {
    it('should return anomaly predictions for batch input', async () => {
      const mockInput = [
        { cycleTimeHours: 48, rejectionCount: 0, revisionCount: 2, daysOverSLA: 0, stageCount: 5, hourOfDaySubmitted: 10 },
        { cycleTimeHours: 120, rejectionCount: 2, revisionCount: 5, daysOverSLA: 2, stageCount: 8, hourOfDaySubmitted: 14 }
      ]
      
      const mockResponse = [
        { id: '1', anomalyScore: 0.2, isAnomaly: false, severity: 'Normal' },
        { id: '2', anomalyScore: 0.85, isAnomaly: true, severity: 'High' }
      ]
      
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const result = await MLService.predictAnomalies(mockInput)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mlServiceUrl}/predict/anomaly`,
        { decisions: mockInput }
      )
      expect(result).toHaveLength(2)
      expect(result[1].isAnomaly).toBe(true)
    })
  })

  describe('predictRisk', () => {
    it('should return risk score for department', async () => {
      const mockFeatures = {
        hourOfDaySubmitted: 10,
        revisionCount: 2,
        stageCount: 5,
        avgCycleTimeHours: 24
      }
      
      const mockResponse = {
        riskScore: 75,
        riskLevel: 'High',
        featureImportance: { revisionCount: 0.4, stageCount: 0.3 }
      }
      
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const result = await MLService.predictRisk(mockFeatures)

      expect(result.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.riskScore).toBeLessThanOrEqual(100)
    })
  })
})
