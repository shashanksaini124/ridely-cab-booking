
import jwt from 'jsonwebtoken'
import pool from '../config/postgres.js'

const postgresAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required. Please log in.',
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const result = await pool.query(
      `SELECT id, name, email, role
       FROM public.users
       WHERE id = $1`,
      [decoded.userId]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({
        message: 'User not found. Please log in again.',
      })
    }

    req.user = {
      userId: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role || 'customer',
    }

    next()
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Invalid or expired token. Please log in again.',
      })
    }

    console.error('PostgreSQL authentication error:', error.message)

    return res.status(500).json({
      message: 'Authentication failed.',
    })
  }
}

export default postgresAuthMiddleware
