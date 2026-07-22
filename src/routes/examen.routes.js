const express = require('express')
const router = express.Router()
const ExamenController = require('../controllers/examen.controller')
const authenticate = require('../middlewares/auth.middleware')

router.use(authenticate)

router.post('/examens', ExamenController.create)
router.get('/examens/hospital', ExamenController.getByHospital)
router.get('/examens/pending', ExamenController.getPending)
router.get('/examens/:id', ExamenController.getById)
router.get('/:consultationId/examens', ExamenController.getByConsultation)
router.put('/examens/:id/result', ExamenController.updateResult)

module.exports = router