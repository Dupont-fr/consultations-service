describe('Consultation Service', () => {
  let service

  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  }

  beforeEach(() => {
    jest.mock('../src/config/db', () => ({ pool: mockPool }))
    service = require('../src/services/consultation.service')
  })

  afterEach(() => jest.resetModules())

  describe('create', () => {
    test('should create consultation with ACCUEIL status', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, statut: 'ACCUEIL', motif_consultation: 'Fièvre' }] })
      const result = await service.create({
        patientId: 1,
        motifConsultation: 'Fièvre',
        createdBy: 'acc1',
        hopital: 'Central',
      })
      expect(result).toBeDefined()
      expect(result.statut).toBe('ACCUEIL')
    })
  })

  describe('getAll', () => {
    test('should return paginated results', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })

      const result = await service.getAll({})
      expect(result.consultations).toHaveLength(2)
      expect(result.total).toBe(3)
    })
  })

  describe('getById', () => {
    test('should return consultation if found', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, motif_consultation: 'Fièvre' }] })
      const result = await service.getById(1)
      expect(result).toBeDefined()
    })

    test('should throw if not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] })
      await expect(service.getById(999)).rejects.toThrow('Consultation non trouvée')
    })
  })

  describe('update', () => {
    test('should update consultation fields', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1, observations: 'RAS' }] })
      const result = await service.update(1, { observations: 'RAS' })
      expect(result).toBeDefined()
    })
  })

  describe('delete', () => {
    test('should delete and return consultation', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] })
      const result = await service.delete(1)
      expect(result).toBeDefined()
    })
  })

  describe('getByPatient', () => {
    test('should return consultations for a patient', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] })
      const result = await service.getByPatient(1)
      expect(result).toHaveLength(2)
    })
  })
})
