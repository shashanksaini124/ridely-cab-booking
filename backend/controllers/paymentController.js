
import Razorpay from 'razorpay'
import crypto from 'crypto'
import Ride from '../models/Ride.js'

const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay keys missing. Check backend/.env'
    )
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  })
}

// Create a Razorpay order for the authenticated user's ride
const createPaymentOrder = async (req, res) => {
  try {
    const { rideId } = req.body

    if (!rideId) {
      return res.status(400).json({
        message: 'Ride ID is required.',
      })
    }

    const ride = await Ride.findById(rideId)

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found.',
      })
    }

    // Only the ride owner can pay for this ride.
    if (
      !ride.user ||
      ride.user.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: 'You cannot pay for this ride.',
      })
    }

    if (ride.paymentMethod === 'Cash') {
      return res.status(400).json({
        message: 'Cash rides do not require online payment.',
      })
    }

    if (ride.paymentStatus === 'Paid') {
      return res.status(400).json({
        message: 'This ride is already paid.',
      })
    }

    if (!Number.isFinite(ride.fare) || ride.fare <= 0) {
      return res.status(400).json({
        message: 'Invalid ride fare.',
      })
    }

    // Reuse an existing pending order if one is already stored.
    // A saved order ID is not proof that payment was completed.
    if (
      ride.paymentTransactionId &&
      ride.paymentTransactionId.startsWith('order_')
    ) {
      return res.status(200).json({
        message: 'Existing payment order found.',
        orderId: ride.paymentTransactionId,
        amount: Math.round(ride.fare * 100),
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        rideId: ride._id,
      })
    }

    const razorpay = getRazorpay()

    const order = await razorpay.orders.create({
      amount: Math.round(ride.fare * 100),
      currency: 'INR',
      receipt: `ride_${ride._id}`,
      notes: {
        rideId: String(ride._id),
        userId: String(req.user.userId),
      },
    })

    // Store the Razorpay order ID until payment is verified.
    ride.paymentTransactionId = order.id
    ride.paymentStatus = 'Pending'
    await ride.save()

    return res.status(201).json({
      message: 'Payment order created successfully.',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      rideId: ride._id,
    })
  } catch (error) {
    console.error('Create payment order error:', error.message)

    return res.status(500).json({
      message: 'Unable to create payment order.',
    })
  }
}

// Verify Razorpay's signature before marking the ride as paid.
const verifyPayment = async (req, res) => {
  try {
    const {
      rideId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body

    if (
      !rideId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: 'Payment verification details are required.',
      })
    }

    const ride = await Ride.findById(rideId)

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found.',
      })
    }

    if (
      !ride.user ||
      ride.user.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: 'You cannot verify payment for this ride.',
      })
    }

    if (ride.paymentStatus === 'Paid') {
      return res.status(200).json({
        message: 'Payment has already been verified.',
        paymentStatus: 'Paid',
      })
    }

    // The submitted order must match the order saved for this ride.
    if (ride.paymentTransactionId !== razorpay_order_id) {
      return res.status(400).json({
        message: 'Payment order does not match this ride.',
      })
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
      throw new Error('Razorpay secret key is missing.')
    }

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
      return res.status(400).json({
        message: 'Invalid payment signature.',
      })
    }

    // Confirm the payment with Razorpay before marking it Paid.
    const razorpay = getRazorpay()
    const payment = await razorpay.payments.fetch(
      razorpay_payment_id
    )

    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== 'captured' ||
      payment.amount !== Math.round(ride.fare * 100) ||
      payment.currency !== 'INR'
    ) {
      return res.status(400).json({
        message: 'Payment is not captured or details do not match.',
      })
    }

    ride.paymentStatus = 'Paid'
    ride.paymentTransactionId = razorpay_payment_id
    ride.paymentPaidAt = new Date()

    await ride.save()

    return res.status(200).json({
      message: 'Payment verified successfully.',
      paymentStatus: ride.paymentStatus,
      paymentId: razorpay_payment_id,
      rideId: ride._id,
    })
  } catch (error) {
    console.error('Verify payment error:', error.message)

    return res.status(500).json({
      message: 'Unable to verify payment.',
    })
  }
}

export {
  createPaymentOrder,
  verifyPayment,
}



export const markCashPaymentPaid = async (req, res) => {
  try {
    const { rideId } = req.params
    const driverId = req.user.userId

    const ride = await Ride.findOne({
      _id: rideId,
      driver: driverId,
    })

    if (!ride) {
      return res.status(404).json({
        message: 'Assigned ride not found.',
      })
    }

    if (ride.paymentMethod !== 'Cash') {
      return res.status(400).json({
        message: 'This ride is not a cash payment ride.',
      })
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({
        message: 'Complete the ride before marking payment as paid.',
      })
    }

    if (ride.paymentStatus === 'Paid') {
      return res.status(400).json({
        message: 'Cash payment is already marked as paid.',
      })
    }

    ride.paymentStatus = 'Paid'
    ride.paymentPaidAt = new Date()

    await ride.save()

    return res.status(200).json({
      message: 'Cash payment marked as paid successfully.',
      ride: {
        _id: ride._id,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        paymentPaidAt: ride.paymentPaidAt,
      },
    })
  } catch (error) {
    console.error('Mark cash payment paid error:', error.message)

    return res.status(500).json({
      message: 'Unable to update cash payment status.',
    })
  }
}
