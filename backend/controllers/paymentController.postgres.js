
import Razorpay from 'razorpay'
import crypto from 'crypto'
import pool from '../config/postgres.js'

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys missing. Check backend/.env')
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

// Create or reuse an order for the authenticated customer's ride.
export const createPaymentOrder = async (req, res) => {
  try {
    const { rideId } = req.body

    if (!rideId || !/^\d+$/.test(String(rideId))) {
      return res.status(400).json({ message: 'Valid ride ID is required.' })
    }

    const result = await pool.query(
      `SELECT *
       FROM public.rides
       WHERE id = $1 AND customer_id = $2`,
      [rideId, req.user.userId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Ride not found.' })
    }

    const ride = result.rows[0]

    if (ride.payment_method === 'Cash') {
      return res.status(400).json({
        message: 'Cash rides do not require online payment.',
      })
    }

    if (ride.payment_status === 'Paid') {
      return res.status(400).json({ message: 'This ride is already paid.' })
    }

    const amount = Math.round(Number(ride.fare) * 100)

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid ride fare.' })
    }

    if (
      ride.payment_transaction_id &&
      ride.payment_transaction_id.startsWith('order_')
    ) {
      return res.status(200).json({
        message: 'Existing payment order found.',
        orderId: ride.payment_transaction_id,
        amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        rideId: String(ride.id),
      })
    }

    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `ride_${ride.id}`,
      notes: {
        rideId: String(ride.id),
        userId: String(req.user.userId),
      },
    })

    const update = await pool.query(
      `UPDATE public.rides
       SET payment_transaction_id = $1,
           payment_status = 'Pending'
       WHERE id = $2
         AND customer_id = $3
         AND payment_status <> 'Paid'
       RETURNING id`,
      [order.id, ride.id, req.user.userId]
    )

    if (!update.rowCount) {
      return res.status(409).json({
        message: 'Ride payment status changed. Please refresh and try again.',
      })
    }

    return res.status(201).json({
      message: 'Payment order created successfully.',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      rideId: String(ride.id),
    })
  } catch (error) {
    console.error('Create payment order error:', error.message)
    return res.status(500).json({
      message: 'Unable to create payment order.',
    })
  }
}

// Verify Razorpay signature and confirm the captured payment.
export const verifyPayment = async (req, res) => {
  try {
    const {
      rideId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body

    if (
      !rideId ||
      !/^\d+$/.test(String(rideId)) ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: 'Valid payment verification details are required.',
      })
    }

    const result = await pool.query(
      `SELECT *
       FROM public.rides
       WHERE id = $1 AND customer_id = $2`,
      [rideId, req.user.userId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Ride not found.' })
    }

    const ride = result.rows[0]

    if (ride.payment_status === 'Paid') {
      return res.status(200).json({
        message: 'Payment has already been verified.',
        paymentStatus: 'Paid',
      })
    }

    if (ride.payment_method === 'Cash') {
      return res.status(400).json({
        message: 'This ride uses cash payment.',
      })
    }

    if (ride.payment_transaction_id !== razorpay_order_id) {
      return res.status(400).json({
        message: 'Payment order does not match this ride.',
      })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) throw new Error('Razorpay secret key is missing.')

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const expectedBuffer = Buffer.from(expectedSignature)
    const receivedBuffer = Buffer.from(razorpay_signature)

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({ message: 'Invalid payment signature.' })
    }

    const razorpay = getRazorpay()
    const payment = await razorpay.payments.fetch(razorpay_payment_id)
    const expectedAmount = Math.round(Number(ride.fare) * 100)

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== 'captured' ||
      payment.amount !== expectedAmount ||
      payment.currency !== 'INR'
    ) {
      return res.status(400).json({
        message: 'Payment is not captured or details do not match.',
      })
    }

    const update = await pool.query(
      `UPDATE public.rides
       SET payment_status = 'Paid',
           payment_transaction_id = $1,
           payment_paid_at = NOW()
       WHERE id = $2
         AND customer_id = $3
         AND payment_transaction_id = $4
         AND payment_status <> 'Paid'
       RETURNING id, payment_status`,
      [
        razorpay_payment_id,
        ride.id,
        req.user.userId,
        razorpay_order_id,
      ]
    )

    if (!update.rowCount) {
      return res.status(409).json({
        message: 'Payment status changed. Please refresh and check your ride.',
      })
    }

    return res.status(200).json({
      message: 'Payment verified successfully.',
      paymentStatus: 'Paid',
      paymentId: razorpay_payment_id,
      rideId: String(ride.id),
    })
  } catch (error) {
    console.error('Verify payment error:', error.message)
    return res.status(500).json({
      message: 'Unable to verify payment.',
    })
  }
}

// Driver marks cash as collected after completing the assigned ride.
export const markCashPaymentPaid = async (req, res) => {
  try {
    const { rideId } = req.params

    if (!/^\d+$/.test(rideId)) {
      return res.status(400).json({ message: 'Invalid ride ID.' })
    }

    const result = await pool.query(
      `UPDATE public.rides
       SET payment_status = 'Paid',
           payment_paid_at = NOW()
       WHERE id = $1
         AND driver_id = $2
         AND payment_method = 'Cash'
         AND status = 'completed'
         AND payment_status <> 'Paid'
       RETURNING id, payment_method, payment_status, payment_paid_at`,
      [rideId, req.user.userId]
    )

    if (!result.rowCount) {
      const check = await pool.query(
        `SELECT driver_id, payment_method, status, payment_status
         FROM public.rides
         WHERE id = $1`,
        [rideId]
      )

      if (!check.rowCount || String(check.rows[0].driver_id) !== String(req.user.userId)) {
        return res.status(404).json({ message: 'Assigned ride not found.' })
      }

      const ride = check.rows[0]

      if (ride.payment_method !== 'Cash') {
        return res.status(400).json({ message: 'This ride is not a cash payment ride.' })
      }

      if (ride.status !== 'completed') {
        return res.status(400).json({
          message: 'Complete the ride before marking payment as paid.',
        })
      }

      return res.status(400).json({
        message: 'Cash payment is already marked as paid.',
      })
    }

    const row = result.rows[0]

    return res.status(200).json({
      message: 'Cash payment marked as paid successfully.',
      ride: {
        _id: String(row.id),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        paymentPaidAt: row.payment_paid_at,
      },
    })
  } catch (error) {
    console.error('Mark cash payment paid error:', error.message)
    return res.status(500).json({
      message: 'Unable to update cash payment status.',
    })
  }
}
