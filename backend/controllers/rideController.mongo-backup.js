
import pool from '../config/postgres.js'

// Convert a PostgreSQL ride row to the field names
// expected by the existing Ridely frontend.
const formatRide = (row) => {
  if (!row) return null

  return {
    _id: String(row.id),
    user: row.customer_id == null ? null : String(row.customer_id),
    driver: row.driver_id == null ? null : String(row.driver_id),
    pickup: row.pickup,
    destination: row.destination,
    pickupCoordinates: {
      latitude: row.pickup_latitude,
      longitude: row.pickup_longitude,
    },
    destinationCoordinates: {
      latitude: row.destination_latitude,
      longitude: row.destination_longitude,
    },
    distanceKm: row.distance_km == null ? null : Number(row.distance_km),
    rideType: row.ride_type,
    fare: Number(row.fare),
    rating: row.rating == null ? null : Number(row.rating),
    review: row.review ?? '',
    ratedAt: row.rated_at,
    status: row.status,
    driverLocation: row.driver_latitude == null
      || row.driver_longitude == null
      ? null
      : {
          latitude: Number(row.driver_latitude),
          longitude: Number(row.driver_longitude),
          updatedAt: row.driver_location_updated_at,
        },
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentTransactionId: row.payment_transaction_id,
    paymentPaidAt: row.payment_paid_at,
    createdAt: row.created_at,
  }
}

// Create a ride booking.
export const createRide = async (req, res) => {
  try {
    const {
      pickup,
      destination,
      rideType,
      pickupCoordinates,
      destinationCoordinates,
      distanceKm,
      paymentMethod = 'Cash',
    } = req.body

    if (
      typeof pickup !== 'string' ||
      typeof destination !== 'string' ||
      !pickup.trim() ||
      !destination.trim()
    ) {
      return res.status(400).json({
        message: 'Pickup and destination are required.',
      })
    }

    const rates = {
      Bike: 3,
      'Three-Wheeler': 4,
      Car: 5,
    }

    if (!Object.prototype.hasOwnProperty.call(rates, rideType)) {
      return res.status(400).json({
        message: 'Please select a valid ride type.',
      })
    }

    if (!['Cash', 'UPI', 'Online'].includes(paymentMethod)) {
      return res.status(400).json({
        message: 'Please select a valid payment method.',
      })
    }

    const validCoordinates = (coords) =>
      coords &&
      typeof coords.latitude === 'number' &&
      Number.isFinite(coords.latitude) &&
      coords.latitude >= -90 &&
      coords.latitude <= 90 &&
      typeof coords.longitude === 'number' &&
      Number.isFinite(coords.longitude) &&
      coords.longitude >= -180 &&
      coords.longitude <= 180

    if (
      !validCoordinates(pickupCoordinates) ||
      !validCoordinates(destinationCoordinates)
    ) {
      return res.status(400).json({
        message: 'Valid pickup and destination coordinates are required.',
      })
    }

    if (
      typeof distanceKm !== 'number' ||
      !Number.isFinite(distanceKm) ||
      distanceKm <= 0 ||
      distanceKm > 1000
    ) {
      return res.status(400).json({
        message: 'A valid road distance is required.',
      })
    }

    const fare = Math.ceil(distanceKm * rates[rideType])

    const result = await pool.query(
      `INSERT INTO public.rides (
        customer_id,
        pickup,
        destination,
        status,
        ride_type,
        distance_km,
        fare,
        payment_method,
        payment_status,
        pickup_latitude,
        pickup_longitude,
        destination_latitude,
        destination_longitude
      )
      VALUES (
        $1, $2, $3, 'requested', $4, $5, $6, $7, 'Pending',
        $8, $9, $10, $11
      )
      RETURNING *`,
      [
        req.user.userId,
        pickup.trim(),
        destination.trim(),
        rideType,
        distanceKm,
        fare,
        paymentMethod,
        pickupCoordinates.latitude,
        pickupCoordinates.longitude,
        destinationCoordinates.latitude,
        destinationCoordinates.longitude,
      ]
    )

    return res.status(201).json({
      message: 'Ride requested successfully.',
      ride: formatRide(result.rows[0]),
    })
  } catch (error) {
    console.error('Create ride error:', error.message)

    return res.status(500).json({
      message: 'Unable to create ride right now.',
    })
  }
}


const rideSelect = `
  SELECT
    r.*,
    json_build_object(
      'name', c.name,
      'email', c.email,
      'phone', c.phone
    ) AS customer,
    CASE
      WHEN d.id IS NULL THEN NULL
      ELSE json_build_object(
        'id', d.id,
        'name', d.name,
        'email', d.email,
        'phone', d.phone
      )
    END AS driver_info
  FROM public.rides r
  JOIN public.users c ON c.id = r.customer_id
  LEFT JOIN public.users d ON d.id = r.driver_id
`

// Get all rides booked by the logged-in customer.
export const getMyRides = async (req, res) => {
  try {
    const result = await pool.query(
      `${rideSelect}
       WHERE r.customer_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.userId]
    )

    const rides = result.rows.map((row) => ({
      ...formatRide(row),
      driver: row.driver_info,
    }))

    return res.status(200).json({ rides })
  } catch (error) {
    console.error('Get rides error:', error.message)
    return res.status(500).json({
      message: 'Unable to fetch rides right now.',
    })
  }
}

// Get rides that drivers can accept.
export const getAvailableRides = async (req, res) => {
  try {
    const result = await pool.query(
      `${rideSelect}
       WHERE r.status = 'requested'
         AND r.driver_id IS NULL
       ORDER BY r.created_at ASC`
    )

    const rides = result.rows.map((row) => ({
      ...formatRide(row),
      user: row.customer,
    }))

    return res.status(200).json({ rides })
  } catch (error) {
    console.error('Get available rides error:', error.message)
    return res.status(500).json({
      message: 'Unable to fetch available rides.',
    })
  }
}

// Accept a ride atomically so two drivers cannot claim it.
export const acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params

    if (!/^\d+$/.test(rideId)) {
      return res.status(400).json({ message: 'Invalid ride ID.' })
    }

    const result = await pool.query(
      `UPDATE public.rides
       SET driver_id = $1, status = 'accepted'
       WHERE id = $2
         AND status = 'requested'
         AND driver_id IS NULL
       RETURNING *`,
      [req.user.userId, rideId]
    )

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Ride is no longer available or does not exist.',
      })
    }

    return res.status(200).json({
      message: 'Ride accepted successfully.',
      ride: formatRide(result.rows[0]),
    })
  } catch (error) {
    console.error('Accept ride error:', error.message)
    return res.status(500).json({
      message: 'Unable to accept ride.',
    })
  }
}

export const updateRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params
    const { status } = req.body

    const allowedTransitions = {
      ongoing: 'accepted',
      completed: 'ongoing',
    }

    if (!Object.prototype.hasOwnProperty.call(allowedTransitions, status)) {
      return res.status(400).json({
        message: 'Invalid ride status.',
      })
    }

    if (!/^\d+$/.test(rideId)) {
      return res.status(400).json({ message: 'Invalid ride ID.' })
    }

    const result = await pool.query(
      `UPDATE public.rides
       SET status = $1
       WHERE id = $2
         AND driver_id = $3
         AND status = $4
       RETURNING *`,
      [status, rideId, req.user.userId, allowedTransitions[status]]
    )

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Ride not found or status transition not allowed.',
      })
    }

    return res.status(200).json({
      message: status === 'ongoing'
        ? 'Ride started successfully.'
        : 'Ride completed successfully.',
      ride: formatRide(result.rows[0]),
    })
  } catch (error) {
    console.error('Update ride status error:', error.message)
    return res.status(500).json({
      message: 'Unable to update ride status.',
    })
  }
}

// Fetch rides assigned to the logged-in driver.
export const getMyDriverRides = async (req, res) => {
  try {
    const result = await pool.query(
      `${rideSelect}
       WHERE r.driver_id = $1
         AND r.status IN ('accepted', 'ongoing', 'completed')
       ORDER BY r.created_at DESC`,
      [req.user.userId]
    )

    const rides = result.rows.map((row) => ({
      ...formatRide(row),
      user: row.customer,
    }))

    return res.status(200).json({ rides })
  } catch (error) {
    console.error('Get driver rides error:', error.message)
    return res.status(500).json({
      message: 'Unable to fetch your assigned rides.',
    })
  }
}


export const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params

    if (!/^\d+$/.test(rideId)) {
      return res.status(400).json({ message: 'Invalid ride ID.' })
    }

    const result = await pool.query(
      `UPDATE public.rides
       SET status = 'cancelled'
       WHERE id = $1
         AND customer_id = $2
         AND status = 'requested'
         AND driver_id IS NULL
       RETURNING *`,
      [rideId, req.user.userId]
    )

    if (!result.rowCount) {
      return res.status(400).json({
        message: 'Ride cannot be cancelled. It may already be accepted, completed, or cancelled.',
      })
    }

    return res.status(200).json({
      message: 'Ride cancelled successfully.',
      ride: formatRide(result.rows[0]),
    })
  } catch (error) {
    console.error('Cancel ride error:', error.message)
    return res.status(500).json({
      message: 'Server error while cancelling ride.',
    })
  }
}

export const rateRide = async (req, res) => {
  try {
    const { rideId } = req.params
    const { rating, review = '' } = req.body
    const parsedRating = Number(rating)

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5 stars.',
      })
    }

    if (typeof review !== 'string' || review.length > 500) {
      return res.status(400).json({
        message: 'Review must be 500 characters or fewer.',
      })
    }

    if (!/^\d+$/.test(rideId)) {
      return res.status(400).json({ message: 'Invalid ride ID.' })
    }

    const result = await pool.query(
      `UPDATE public.rides
       SET rating = $1, review = $2, rated_at = NOW()
       WHERE id = $3
         AND customer_id = $4
         AND status = 'completed'
         AND rating IS NULL
       RETURNING id, rating, review, rated_at`,
      [parsedRating, review.trim(), rideId, req.user.userId]
    )

    if (!result.rowCount) {
      const existing = await pool.query(
        `SELECT status, rating
         FROM public.rides
         WHERE id = $1 AND customer_id = $2`,
        [rideId, req.user.userId]
      )

      if (!existing.rowCount) {
        return res.status(404).json({ message: 'Ride not found.' })
      }

      if (existing.rows[0].status !== 'completed') {
        return res.status(400).json({
          message: 'You can rate a ride only after it is completed.',
        })
      }

      return res.status(400).json({
        message: 'You have already rated this ride.',
      })
    }

    const row = result.rows[0]

    return res.status(200).json({
      message: 'Rating submitted successfully.',
      ride: {
        _id: String(row.id),
        rating: Number(row.rating),
        review: row.review,
        ratedAt: row.rated_at,
      },
    })
  } catch (error) {
    console.error('Rate ride error:', error.message)
    return res.status(500).json({
      message: 'Unable to submit rating.',
    })
  }
}

export const getDriverStats = async (req, res) => {
  try {
    const driverId = req.user.userId

    const [availableResult, completedResult, ratingResult] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS count
           FROM public.rides
           WHERE status = 'requested'
             AND driver_id IS NULL`
        ),
        pool.query(
          `SELECT fare, payment_method, payment_status
           FROM public.rides
           WHERE driver_id = $1 AND status = 'completed'`,
          [driverId]
        ),
        pool.query(
          `SELECT
             COALESCE(AVG(rating), 0) AS average_rating,
             COUNT(rating)::int AS total_reviews
           FROM public.rides
           WHERE driver_id = $1
             AND status = 'completed'
             AND rating BETWEEN 1 AND 5`,
          [driverId]
        ),
      ])

    const completed = completedResult.rows

    const totalEarnings = completed.reduce(
      (sum, ride) => sum + Number(ride.fare || 0), 0
    )

    const onlinePaymentsCollected = completed.reduce(
      (sum, ride) =>
        ride.payment_method !== 'Cash' && ride.payment_status === 'Paid'
          ? sum + Number(ride.fare || 0)
          : sum,
      0
    )

    const cashPaymentsExpected = completed.reduce(
      (sum, ride) =>
        ride.payment_method === 'Cash'
          ? sum + Number(ride.fare || 0)
          : sum,
      0
    )

    const unpaidOnlineRides = completed.filter(
      (ride) =>
        ride.payment_method !== 'Cash' &&
        ride.payment_status !== 'Paid'
    ).length

    const rating = ratingResult.rows[0]

    return res.status(200).json({
      availableRequests: availableResult.rows[0].count,
      completedRides: completed.length,
      totalEarnings,
      onlinePaymentsCollected,
      cashPaymentsExpected,
      unpaidOnlineRides,
      averageRating: Number(Number(rating.average_rating).toFixed(1)),
      totalReviews: rating.total_reviews,
    })
  } catch (error) {
    console.error('Get driver stats error:', error.message)
    return res.status(500).json({
      message: 'Unable to fetch driver statistics.',
    })
  }
}

// Completed ride history and earnings summary for the driver.
export const getDriverRideHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `${rideSelect}
       WHERE r.driver_id = $1 AND r.status = 'completed'
       ORDER BY r.created_at DESC`,
      [req.user.userId]
    )

    const rides = result.rows.map((row) => ({
      ...formatRide(row),
      user: row.customer,
    }))

    const totalEarnings = rides.reduce(
      (sum, ride) => sum + (Number(ride.fare) || 0), 0
    )

    const ratings = rides
      .map((ride) => ride.rating)
      .filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5)

    const averageRating = ratings.length
      ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1))
      : 0

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const dailyEarnings = rides.reduce((sum, ride) => {
      const date = new Date(ride.createdAt)
      return date >= todayStart && date < tomorrowStart
        ? sum + (Number(ride.fare) || 0)
        : sum
    }, 0)

    const monthlyEarnings = rides.reduce((sum, ride) => {
      const date = new Date(ride.createdAt)
      return date >= monthStart ? sum + (Number(ride.fare) || 0) : sum
    }, 0)

    return res.status(200).json({
      rides,
      summary: {
        totalCompletedRides: rides.length,
        totalEarnings,
        totalReviews: ratings.length,
        averageRating,
        dailyEarnings,
        monthlyEarnings,
      },
    })
  } catch (error) {
    console.error('Get driver ride history error:', error.message)
    return res.status(500).json({
      message: 'Unable to fetch ride history.',
    })
  }
}


export const updateDriverLocation = async (req, res) => {
  try {
    const { rideId } = req.params
    const { latitude, longitude } = req.body

    if (
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: 'Valid latitude and longitude are required.',
      })
    }

    if (!/^\d+$/.test(rideId)) {
      return res.status(400).json({ message: 'Invalid ride ID.' })
    }

    const result = await pool.query(
      `UPDATE public.rides
       SET driver_latitude = $1,
           driver_longitude = $2,
           driver_location_updated_at = NOW()
       WHERE id = $3
         AND driver_id = $4
         AND status IN ('accepted', 'ongoing')
       RETURNING driver_latitude, driver_longitude,
                 driver_location_updated_at`,
      [latitude, longitude, rideId, req.user.userId]
    )

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Active ride not found or not assigned to you.',
      })
    }

    const row = result.rows[0]

    return res.status(200).json({
      message: 'Driver location updated successfully.',
      driverLocation: {
        latitude: Number(row.driver_latitude),
        longitude: Number(row.driver_longitude),
        updatedAt: row.driver_location_updated_at,
      },
    })
  } catch (error) {
    console.error('Update driver location error:', error.message)
    return res.status(500).json({
      message: 'Unable to update driver location.',
    })
  }
}

export const getDriverLocation = async (req, res) => {
  try {
    const { rideId } = req.params

    if (!/^\d+$/.test(rideId)) {
      return res.status(400).json({ message: 'Invalid ride ID.' })
    }

    const result = await pool.query(
      `SELECT status, driver_id, driver_latitude,
              driver_longitude, driver_location_updated_at
       FROM public.rides
       WHERE id = $1
         AND customer_id = $2
         AND status IN ('accepted', 'ongoing')`,
      [rideId, req.user.userId]
    )

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Active ride not found.',
      })
    }

    const row = result.rows[0]

    if (row.driver_id == null) {
      return res.status(404).json({
        message: 'No driver assigned to this ride yet.',
      })
    }

    const driverLocation =
      row.driver_latitude == null || row.driver_longitude == null
        ? null
        : {
            latitude: Number(row.driver_latitude),
            longitude: Number(row.driver_longitude),
            updatedAt: row.driver_location_updated_at,
          }

    return res.status(200).json({
      status: row.status,
      driverLocation,
    })
  } catch (error) {
    console.error('Get driver location error:', error.message)
    return res.status(500).json({
      message: 'Unable to fetch driver location.',
    })
  }
}
