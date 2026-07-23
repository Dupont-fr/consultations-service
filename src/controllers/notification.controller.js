const NotificationService = require('../services/notification.service')

function isTableMissing(err) {
  return err.message && err.message.includes('relation "notifications" does not exist')
}

class NotificationController {
  static async getAll(req, res, next) {
    try {
      const hospital = req.user?.hospitalUser
      const userId = req.user?.id
      const { page, limit } = req.query

      let result
      if (req.user?.role === 'ADMIN') {
        const r1 = hospital ? await NotificationService.getByHospital(hospital, { page, limit }) : { data: [], total: 0 }
        const r2 = userId ? await NotificationService.getByUserId(userId, { page, limit }) : { data: [], total: 0 }
        const r3 = await NotificationService.getGlobal({ page, limit })
        const merged = [...r1.data, ...r2.data, ...r3.data]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        result = { data: merged, total: r1.total + r2.total + r3.total }
      } else if (hospital) {
        result = await NotificationService.getByHospital(hospital, { page, limit })
      } else if (userId) {
        result = await NotificationService.getByUserId(userId, { page, limit })
      } else {
        result = { data: [], total: 0 }
      }

      res.json({ success: true, data: result.data, total: result.total })
    } catch (error) {
      if (isTableMissing(error)) {
        return res.json({ success: true, data: [], total: 0 })
      }
      next(error)
    }
  }

  static async getUnreadCount(req, res, next) {
    try {
      const hospital = req.user?.hospitalUser
      const userId = req.user?.id
      const count = await NotificationService.getUnreadCount(hospital, userId)
      res.json({ success: true, data: { count } })
    } catch (error) {
      if (isTableMissing(error)) {
        return res.json({ success: true, data: { count: 0 } })
      }
      next(error)
    }
  }

  static async markRead(req, res, next) {
    try {
      await NotificationService.markRead(req.params.id)
      res.json({ success: true, message: 'Notification marquée comme lue' })
    } catch (error) {
      if (isTableMissing(error)) {
        return res.json({ success: true, message: 'OK' })
      }
      next(error)
    }
  }

  static async markAllRead(req, res, next) {
    try {
      const hospital = req.user?.hospitalUser
      const userId = req.user?.id
      await NotificationService.markAllRead(hospital, userId)
      res.json({ success: true, message: 'Toutes les notifications marquées comme lues' })
    } catch (error) {
      if (isTableMissing(error)) {
        return res.json({ success: true, message: 'OK' })
      }
      next(error)
    }
  }

  static async create(req, res, next) {
    try {
      const { hospital, userId, type, title, message, link, data } = req.body
      const notification = await NotificationService.create({ hospital, userId, type, title, message, link, data })

      if (req.io) {
        if (hospital) {
          req.io.to(`hospital:${hospital}`).emit('notification:new', notification)
        }
        if (userId) {
          req.io.to(`user:${userId}`).emit('notification:new', notification)
        }
      }

      res.status(201).json({ success: true, data: notification })
    } catch (error) {
      if (isTableMissing(error)) {
        return res.status(201).json({ success: true, data: null })
      }
      next(error)
    }
  }
}

module.exports = NotificationController
