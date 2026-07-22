const ExamenService = require('../services/examen.service')
const NotificationService = require('../services/notification.service')

class ExamenController {
  static async create(req, res, next) {
    try {
      const examen = await ExamenService.create({
        ...req.body,
        hopitalSource: req.user?.hospitalUser || null,
      })

      if (req.body.hopitalDestination && req.io) {
        req.io.to(`hospital:${req.body.hopitalDestination}`).emit('examen:new', {
          message: 'Nouvel examen à réaliser',
          examenId: examen.id,
          consultationId: examen.consultationId,
          type: examen.type,
        })
      }

      if (req.body.hopitalDestination) {
        const notification = await NotificationService.create({
          hospital: req.body.hopitalDestination,
          type: 'examen',
          title: 'Nouvel examen à réaliser',
          message: `${examen.type} — Consultation #${examen.consultationId}`,
          link: '/examens/pending',
          data: { examenId: examen.id, consultationId: examen.consultationId },
        })

        if (req.io) {
          req.io.to(`hospital:${req.body.hopitalDestination}`).emit('notification:new', notification)
        }
      }

      res.status(201).json({ success: true, data: examen })
    } catch (error) {
      next(error)
    }
  }

  static async getByConsultation(req, res, next) {
    try {
      const examens = await ExamenService.getByConsultation(req.params.consultationId)
      res.json({ success: true, data: examens })
    } catch (error) {
      next(error)
    }
  }

  static async getByHospital(req, res, next) {
    try {
      const hospital = req.user?.hospitalUser
      const examens = await ExamenService.getByHospital(hospital, req.user)
      res.json({ success: true, data: examens })
    } catch (error) {
      next(error)
    }
  }

  static async getPending(req, res, next) {
    try {
      const hospital = req.user?.hospitalUser
      if (!hospital) {
        return res.status(400).json({ success: false, message: 'Aucun hôpital associé' })
      }
      const examens = await ExamenService.getPendingByHospital(hospital)
      res.json({ success: true, data: examens })
    } catch (error) {
      next(error)
    }
  }

  static async getById(req, res, next) {
    try {
      const examen = await ExamenService.getById(req.params.id)
      res.json({ success: true, data: examen })
    } catch (error) {
      next(error)
    }
  }

  static async updateResult(req, res, next) {
    try {
      const examen = await ExamenService.updateResult(req.params.id, {
        resultats: req.body.resultats,
        realisePar: req.user?.id,
      })
      res.json({ success: true, data: examen, message: 'Résultats enregistrés' })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = ExamenController