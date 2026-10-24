
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/postgres.js'

// Register user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
      })
    }

    const selectedRole = role || 'customer'

    if (!['customer', 'driver'].includes(selectedRole)) {
      return res.status(400).json({
        message: 'Role must be customer or driver',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedName = name.trim()
    const normalizedPhone =
      typeof phone === 'string' ? phone.trim() : ''

    const existingUser = await pool.query(
      'SELECT id FROM public.users WHERE email = $1',
      [normalizedEmail]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'Email is already registered',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO public.users
        (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      [
        normalizedName,
        normalizedEmail,
        normalizedPhone,
        hashedPassword,
        selectedRole,
      ]
    )

    const user = result.rows[0]

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Email is already registered',
      })
    }

    console.error('Register error:', error.message)

    return res.status(500).json({
      message: 'Registration failed',
    })
  }
}

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required',
      })
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role
       FROM public.users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    const token = jwt.sign(
      {
        userId: String(user.id),
        role: user.role || 'customer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'customer',
      },
    })
  } catch (error) {
    console.error('Login error:', error.message)

    return res.status(500).json({
      message: 'Login failed',
    })
  }
}

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body
    const updates = []
    const values = []

    if (typeof name === 'string') {
      if (!name.trim()) {
        return res.status(400).json({
          message: 'Name cannot be empty',
        })
      }

      values.push(name.trim())
      updates.push(`name = $${values.length}`)
    }

    if (typeof phone === 'string') {
      values.push(phone.trim())
      updates.push(`phone = $${values.length}`)
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: 'Please provide a name or phone number to update',
      })
    }

    values.push(req.user.userId)

    const result = await pool.query(
      `UPDATE public.users
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, email, phone, role`,
      values
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user,
    })
  } catch (error) {
    console.error('Update profile error:', error.message)

    return res.status(500).json({
      message: 'Unable to update profile',
    })
  }
}
