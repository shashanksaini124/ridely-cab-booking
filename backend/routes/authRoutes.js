
import express from 'express'
import {
  registerUser,
  loginUser,
  updateProfile,
} from '../controllers/authController.js'

import postgresAuthMiddleware from '../middleware/postgresAuthMiddleware.js'

const router = express.Router()

// Signup
router.post('/register', registerUser)

// Login
router.post('/login', loginUser)

// Update profile — PostgreSQL authentication
router.patch('/profile', postgresAuthMiddleware, updateProfile)

export default router
