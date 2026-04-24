import { Request, Response, NextFunction } from 'express'
import { validateJWT } from '../../middleware/validateJWT'
import jwt from 'jsonwebtoken'

// Mock JWT secret
process.env.JWT_SECRET = 'test-secret'

describe('validateJWT Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    mockNext = jest.fn()
  })

  it('should reject request without Authorization header', () => {
    validateJWT(mockReq as Request, mockRes as Response, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should reject request with malformed Authorization header', () => {
    mockReq.headers = { authorization: 'InvalidFormat token123' }
    
    validateJWT(mockReq as Request, mockRes as Response, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should reject invalid token', () => {
    mockReq.headers = { authorization: 'Bearer invalidtoken' }
    
    validateJWT(mockReq as Request, mockRes as Response, mockNext)
    
    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' })
  })

  it('should accept valid token and set req.user', () => {
    const payload = { userId: 'user-123', role: 'admin', department: 'OP001' }
    const token = jwt.sign(payload, process.env.JWT_SECRET!)
    mockReq.headers = { authorization: `Bearer ${token}` }
    
    validateJWT(mockReq as Request, mockRes as Response, mockNext)
    
    expect(mockNext).toHaveBeenCalled()
    expect(mockReq.user).toBeDefined()
    expect(mockReq.user!.userId).toBe('user-123')
  })
})
