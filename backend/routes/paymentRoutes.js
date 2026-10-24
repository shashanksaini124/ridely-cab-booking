
import express from 'express'

import {
  createPaymentOrder,
  verifyPayment,
  markCashPaymentPaid,
} from '../controllers/paymentController.postgres.js'

import postgresAuthMiddleware from '../middleware/postgresAuthMiddleware.js'
import driverOnly from '../middleware/driverOnly.js'

const router = express.Router()

router.post(
  '/create-order',
  postgresAuthMiddleware,
  createPaymentOrder
)

router.post(
  '/verify',
  postgresAuthMiddleware,
  verifyPayment
)

router.patch(
  '/cash/:rideId/paid',
  postgresAuthMiddleware,
  driverOnly,
  markCashPaymentPaid
)

export default router
