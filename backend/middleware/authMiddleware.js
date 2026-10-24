
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required. Please log in.'
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Always verify the user and role from the database
    const user = await User.findById(decoded.userId).select(
      '_id name email role'
    )

    if (!user) {
      return res.status(401).json({
        message: 'User not found. Please log in again.'
      })
    }

    req.user = {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || 'customer'
    }

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Invalid or expired token. Please log in again.'
      })
    }

    console.error('Authentication error:', error.message)

    return res.status(500).json({
      message: 'Authentication failed.'
    })
  }
}

export default authMiddleware
