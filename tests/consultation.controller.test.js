describe('Consultation Controller', () => {
  let controller
  let req, res, next

  const mockService = {
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getByPatient: jest.fn(),
  }

  beforeEach(() => {
    jest.mock('../src/services/consultation.service', () => mockService)
    controller = require('../src/controllers/consultation.controller')
    req = { body: {}, params: {}, query: {}, user: { id: 'doc1', role: 'MEDECIN' } }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()
  })

  afterEach(() => jest.resetModules())

  test('create should return 201', async () => {
    mockService.create.mockResolvedValue({ id: 1, motif: 'Fièvre' })
    req.body = { motifConsultation: 'Fièvre', patientId: 1 }
    await controller.create(req, res, next)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  test('create should call next on error', async () => {
    mockService.create.mockRejectedValue(new Error('fail'))
    await controller.create(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  test('getAll should return consultations', async () => {
    mockService.getAll.mockResolvedValue({ consultations: [], total: 0 })
    await controller.getAll(req, res, next)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  test('getById should return consultation', async () => {
    mockService.getById.mockResolvedValue({ id: 1, motif: 'Fièvre' })
    req.params.id = '1'
    await controller.getById(req, res, next)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  test('getByPatient should return patient consultations', async () => {
    mockService.getByPatient.mockResolvedValue([{ id: 1 }])
    req.params.patientId = '1'
    await controller.getByPatient(req, res, next)
    expect(mockService.getByPatient).toHaveBeenCalledWith('1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  test('update should return updated consultation', async () => {
    mockService.update.mockResolvedValue({ id: 1, motif: 'Updated' })
    req.params.id = '1'
    req.body = { motifConsultation: 'Updated' }
    await controller.update(req, res, next)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })

  test('delete should return success message', async () => {
    mockService.delete.mockResolvedValue({})
    req.params.id = '1'
    await controller.delete(req, res, next)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    )
  })
})
