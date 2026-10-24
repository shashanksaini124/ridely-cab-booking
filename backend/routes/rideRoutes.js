
import express from 'express'
import postgresAuthMiddleware from '../middleware/postgresAuthMiddleware.js'
import driverOnly from '../middleware/driverOnly.js'

import {
  createRide,
  getMyRides,
  getAvailableRides,
  acceptRide,
  updateRideStatus,
  getMyDriverRides,
  getDriverStats,
  cancelRide,
  rateRide,
  getDriverRideHistory,
  updateDriverLocation,
  getDriverLocation,
} from '../controllers/rideController.postgres.js'

const router = express.Router()

router.post('/', postgresAuthMiddleware, createRide)
router.get('/my-rides', postgresAuthMiddleware, getMyRides)

router.get(
  '/available',
  postgresAuthMiddleware,
  driverOnly,
  getAvailableRides
)

router.get(
  '/my-driver-rides',
  postgresAuthMiddleware,
  driverOnly,
  getMyDriverRides
)

router.patch(
  '/:rideId/accept',
  postgresAuthMiddleware,
  driverOnly,
  acceptRide
)

router.patch(
  '/:rideId/status',
  postgresAuthMiddleware,
  driverOnly,
  updateRideStatus
)

router.get(
  '/driver-stats',
  postgresAuthMiddleware,
  driverOnly,
  getDriverStats
)

router.patch('/:rideId/cancel', postgresAuthMiddleware, cancelRide)
router.patch('/:rideId/rating', postgresAuthMiddleware, rateRide)
router.get('/driver-history', postgresAuthMiddleware, getDriverRideHistory)

router.patch(
  '/:rideId/location',
  postgresAuthMiddleware,
  driverOnly,
  updateDriverLocation
)

router.get('/:rideId/location', postgresAuthMiddleware, getDriverLocation)

export default router
