const express = require('express')
const router = express.Router()
const ConsultationController = require('../controllers/consultation.controller')
const authenticate = require('../middlewares/auth.middleware')

router.use(authenticate)

router.get('/', ConsultationController.getAll)
router.get('/:id', ConsultationController.getById)
router.post('/register', ConsultationController.create)
router.put('/:id', ConsultationController.update)
router.put('/:id/transfer', ConsultationController.transfer)
router.delete('/:id', ConsultationController.delete)

module.exports = router
