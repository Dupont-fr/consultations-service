const express = require('express')
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
require('dotenv').config()

const { initDB } = require('./config/db')
const consultationRoutes = require('./routes/consultation.routes')
const examenRoutes = require('./routes/examen.routes')
const notificationRoutes = require('./routes/notification.routes')
const errorHandler = require('./middlewares/errorHandler')

const app = express()
const PORT = process.env.PORT || 3003
const HOST = process.env.HOST || '0.0.0.0'

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim())
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true)
    cb(null, false)
  }
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Consultation Service is running' })
})

app.use('/', consultationRoutes)
app.use('/', examenRoutes)
app.use('/', notificationRoutes)

app.use(errorHandler)

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true)
      cb(null, false)
    },
    methods: ['GET', 'POST'],
  },
})

app.use((req, res, next) => {
  req.io = io
  next()
})

io.on('connection', (socket) => {
  console.log('🔌 Client WebSocket connecté:', socket.id)

  socket.on('join:notifications', (hospital) => {
    if (hospital) socket.join(`hospital:${hospital}`)
  })

  socket.on('join:user', (userId) => {
    if (userId) socket.join(`user:${userId}`)
  })

  socket.on('disconnect', () => {
    console.log('🔌 Client WebSocket déconnecté:', socket.id)
  })
})

const startServer = async () => {
  try {
    await initDB()
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Consultation Service (PostgreSQL + WebSocket) démarré sur http://${HOST}:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Échec du démarrage:', error.message)
    setTimeout(startServer, 5000)
  }
}

startServer()

module.exports = app
