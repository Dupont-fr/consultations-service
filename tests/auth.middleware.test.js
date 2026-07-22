const jwt = require('jsonwebtoken')

jest.mock('jsonwebtoken')

describe('Consultation Auth Middleware', () => {
  let authenticate
  let req, res, next

  beforeEach(() => {
    jest.resetModules()
    process.env.JWT_SECRET = 'test-secret'
    authenticate = require('../src/middlewares/auth.middleware')
    req = { headers: {} }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()
  })

  test('should return 401 if no auth header', () => {
    authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('should return 401 if token invalid', () => {
    req.headers.authorization = 'Bearer bad'
    jwt.verify.mockImplementation(() => { throw new Error('bad') })
    authenticate(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  test('should pass with valid token', () => {
    req.headers.authorization = 'Bearer valid'
    jwt.verify.mockReturnValue({ id: '123', role: 'MEDECIN' })
    authenticate(req, res, next)
    expect(req.user).toEqual({ id: '123', role: 'MEDECIN' })
    expect(next).toHaveBeenCalled()
  })
})
