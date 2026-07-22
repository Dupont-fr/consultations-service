describe('Consultation Error Handler', () => {
  let errorHandler
  let req, res

  beforeEach(() => {
    errorHandler = require('../src/middlewares/errorHandler')
    req = { method: 'POST', originalUrl: '/api/consultations' }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
  })

  test('should return 500 by default', () => {
    errorHandler(new Error('fail'), req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(500)
  })

  test('should return custom status if set on error', () => {
    const err = new Error('custom')
    err.status = 400
    err.errors = [{ message: 'invalid' }]
    err.name = 'ValidationError'
    errorHandler(err, req, res, jest.fn())
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
