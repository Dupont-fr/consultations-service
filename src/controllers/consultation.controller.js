const ConsultationService = require('../services/consultation.service')

const SENSITIVE_FIELDS = ['motifConsultation', 'observations', 'conclusion', 'decision', 'prescription', 'poids', 'taille', 'temperature', 'tension']

function stripSensitiveFields(data, user) {
  if (!data || user?.role !== 'ACCUEIL') return data
  if (Array.isArray(data)) return data.map(d => stripSensitiveFields(d, user))
  const clone = { ...data }
  for (const f of SENSITIVE_FIELDS) delete clone[f]
  return clone
}

class ConsultationController {
  static async create(req, res, next) {
    try {
      const consultation = await ConsultationService.create({
        ...req.body,
        doctorId: req.user?.id,
        doctorName: req.user?.nameUser || req.user?.name,
        doctorSpecialty: req.user?.specialtyUser || null,
        doctorHospital: req.user?.hospitalUser || null,
        createdBy: req.user?.id,
      })
      res.status(201).json({ success: true, data: stripSensitiveFields(consultation, req.user) })
    } catch (error) {
      next(error)
    }
  }

  static async getAll(req, res, next) {
    try {
      const filters = { ...req.query }
      if (req.user?.hospitalUser && req.user?.role !== 'ADMIN') {
        filters.doctorHospital = req.user.hospitalUser
      }
      if (req.user?.role === 'MEDECIN' && req.user?.specialtyUser) {
        filters.doctorSpecialty = req.user.specialtyUser
      }
      const result = await ConsultationService.getAll(filters)
      res.json({ success: true, data: stripSensitiveFields(result.data, req.user), total: result.total, page: result.page, totalPages: result.totalPages })
    } catch (error) {
      next(error)
    }
  }

  static async getById(req, res, next) {
    try {
      const consultation = await ConsultationService.getById(req.params.id, req.user?.id)
      if (req.user?.role !== 'ADMIN' && req.user?.hospitalUser && consultation.doctorHospital !== req.user.hospitalUser) {
        return res.status(403).json({ success: false, message: 'Consultation non disponible dans votre hôpital' })
      }
      if (req.user?.role === 'MEDECIN' && req.user?.specialtyUser) {
        const hasAccess = consultation.doctorSpecialty === req.user.specialtyUser ||
          (consultation.interventions || []).some(inv => inv.doctorSpecialty === req.user.specialtyUser)
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: 'Consultation non disponible pour votre service' })
        }
      }
      res.json({ success: true, data: stripSensitiveFields(consultation, req.user) })
    } catch (error) {
      next(error)
    }
  }

  static async update(req, res, next) {
    try {
      const consultation = await ConsultationService.update(req.params.id, { ...req.body, _currentDoctorId: req.user?.id })
      res.json({ success: true, data: stripSensitiveFields(consultation, req.user) })
    } catch (error) {
      next(error)
    }
  }

  static async delete(req, res, next) {
    try {
      await ConsultationService.delete(req.params.id)
      res.json({ success: true, message: 'Consultation supprimée' })
    } catch (error) {
      next(error)
    }
  }

  static async transfer(req, res, next) {
    try {
      if (req.user?.role === 'ACCUEIL') {
        return res.status(403).json({ success: false, message: 'Seuls les médecins peuvent transférer une consultation' })
      }
      const { destinationHospital } = req.body
      if (!destinationHospital) {
        return res.status(400).json({ success: false, message: 'Hôpital de destination requis' })
      }
      const consultation = await ConsultationService.transfer(req.params.id, {
        destinationHospital,
        currentDoctorId: req.user?.id,
        doctorName: req.user?.nameUser,
        doctorSpecialty: req.user?.specialtyUser,
      })
      res.json({ success: true, data: stripSensitiveFields(consultation, req.user), message: 'Consultation transférée avec succès' })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ConsultationController
