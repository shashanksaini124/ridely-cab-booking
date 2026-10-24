
import express from 'express'
import postgresAuthMiddleware from '../middleware/postgresAuthMiddleware.js'
import driverOnly from '../middleware/driverOnly.js'

const router = express.Router()

router.get(
  '/dashboard',
  postgresAuthMiddleware,
  driverOnly,
  (req, res) => {
    res.status(200).json({
      message: 'Driver dashboard access successful',
      driver: {
        id: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    })
  }
)

export default router
