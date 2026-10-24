
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import pool from './config/postgres.js'

import authRoutes from './routes/authRoutes.js'
import postgresAuthMiddleware from './middleware/postgresAuthMiddleware.js'
import rideRoutes from './routes/rideRoutes.js'
import driverRoutes from './routes/driverRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://10.71.144.216:5173',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    // Allow requests without an Origin header, such as server-side health checks.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error('Origin not allowed by CORS'))
  },
}))

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ridely backend is running',
  })
})

app.get('/api/auth/me', postgresAuthMiddleware, (req, res) => {
  res.status(200).json({
    message: 'Authenticated successfully',
    userId: req.user.userId,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  })
})

// Payment routes — payment controller migration is still pending.
app.use('/api/payments', paymentRoutes)

// PostgreSQL-backed ride routes.
app.use('/api/rides', rideRoutes)

// PostgreSQL-backed authentication routes.
app.use('/api/auth', authRoutes)

// Driver dashboard route — its middleware migration is still pending.
app.use('/api/driver', driverRoutes)

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    // Verify PostgreSQL connection before accepting requests.
    await pool.query('SELECT 1')

    app.listen(PORT, () => {
      console.log(`Ridely backend running on port ${PORT}`)
      console.log('Supabase PostgreSQL connected successfully')
      console.log(
        'Razorpay Key ID loaded:',
        Boolean(process.env.RAZORPAY_KEY_ID)
      )
    })
  } catch (error) {
    console.error('Server startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
