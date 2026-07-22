const express = require('express')
const router = express.Router()
const NotificationController = require('../controllers/notification.controller')
const authenticate = require('../middlewares/auth.middleware')

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'medisys-internal-key-2026'

function authenticateOrInternal(req, res, next) {
  const authHeader = req.headers.authorization
  const internalKey = req.headers['x-internal-key']

  if (internalKey && internalKey === INTERNAL_KEY) {
    req.user = { role: 'ADMIN', id: null }
    return next()
  }

  return authenticate(req, res, next)
}

router.use(authenticateOrInternal)

router.get('/notifications', NotificationController.getAll)
router.get('/notifications/unread-count', NotificationController.getUnreadCount)
router.put('/notifications/read-all', NotificationController.markAllRead)
router.put('/notifications/:id/read', NotificationController.markRead)
router.post('/notifications', NotificationController.create)

module.exports = router
