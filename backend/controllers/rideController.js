
import Ride from '../models/Ride.js'
import mongoose from 'mongoose'


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

 const allowedRideTypes = [
  'Bike',
  'Three-Wheeler',
  'Car',
]

    if (!allowedRideTypes.includes(rideType)) {
      return res.status(400).json({
        message: 'Please select a valid ride type.',
      })
    }

    const allowedPaymentMethods = ['Cash', 'UPI', 'Online']

if (!allowedPaymentMethods.includes(paymentMethod)) {
  return res.status(400).json({
    message: 'Please select a valid payment method.',
  })
}

    function validCoordinates(coords) {
      return (
        coords &&
        typeof coords.latitude === 'number' &&
        Number.isFinite(coords.latitude) &&
        coords.latitude >= -90 &&
        coords.latitude <= 90 &&
        typeof coords.longitude === 'number' &&
        Number.isFinite(coords.longitude) &&
        coords.longitude >= -180 &&
        coords.longitude <= 180
      )
    }

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

    const rateByRideType = {
  Bike: 3,
  'Three-Wheeler': 4,
  Car: 5,
}

const fare = Math.ceil(
  distanceKm * rateByRideType[rideType]
)

const ride = await Ride.create({
  user: req.user.userId,
  pickup: pickup.trim(),
  destination: destination.trim(),
  rideType,
  fare,
  distanceKm,
  pickupCoordinates,
  destinationCoordinates,

  paymentMethod,
  paymentStatus: 'Pending',
})

    return res.status(201).json({
      message: 'Ride requested successfully.',
      ride,
    })
  } catch (error) {
    console.error('Create ride error:', error.message)

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message,
      })
    }

    return res.status(500).json({
      message: 'Unable to create ride right now.',
    })
  }
}


export const getMyRides = async (req, res) => {
  try {
    
const rides = await Ride.find({
  user: req.user.userId,
})
  .populate('driver', 'name email phone')
  .sort({ createdAt: -1 })


    return res.status(200).json({ rides })
  } catch (error) {
    console.error('Get rides error:', error.message)

    return res.status(500).json({
      message: 'Unable to fetch rides right now.'
    })
  }
}


export const getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({
      status: 'requested',
      driver: null
    })
      .populate('user', 'name')
      .sort({ createdAt: 1 })

    return res.status(200).json({ rides })
  } catch (error) {
    console.error('Get available rides error:', error.message)

    return res.status(500).json({
      message: 'Unable to fetch available rides.'
    })
  }
}


export const acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        status: 'requested',
        driver: null
      },
      {
        $set: {
          status: 'accepted',
          driver: req.user.userId
        }
      },
      {
        new: true,
        runValidators: true
      }
    )

    if (!ride) {
      return res.status(404).json({
        message: 'Ride is no longer available or does not exist.'
      })
    }

    return res.status(200).json({
      message: 'Ride accepted successfully.',
      ride
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid ride ID.'
      })
    }

    console.error('Accept ride error:', error.message)

    return res.status(500).json({
      message: 'Unable to accept ride.'
    })
  }
}


export const updateRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params
    const { status } = req.body

    const allowedTransitions = {
      ongoing: 'accepted',
      completed: 'ongoing'
    }

    if (!Object.prototype.hasOwnProperty.call(allowedTransitions, status)) {
      return res.status(400).json({
        message: 'Invalid ride status.'
      })
    }

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        driver: req.user.userId,
        status: allowedTransitions[status]
      },
      {
        $set: { status }
      },
      {
        new: true,
        runValidators: true
      }
    )

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found or status transition not allowed.'
      })
    }

    return res.status(200).json({
      message: status === 'ongoing'
        ? 'Ride started successfully.'
        : 'Ride completed successfully.',
      ride
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid ride ID.'
      })
    }

    console.error('Update ride status error:', error.message)

    return res.status(500).json({
      message: 'Unable to update ride status.'
    })
  }
}





export const getMyDriverRides = async (req, res) => {
  try {
    const rides = await Ride.find({
      driver: req.user.userId,
      status: { $in: ['accepted', 'ongoing', 'completed'] }
    })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })

    return res.status(200).json({ rides })
  } catch (error) {
    console.error('Get my driver rides error:', error.message)

    return res.status(500).json({
      message: 'Unable to fetch your assigned rides.'
    })
  }
}




export const getDriverRideHistory = async (req, res) => {
  try {
    const rides = await Ride.find({
      driver: req.user.userId,
      status: 'completed'
    })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })

    const totalEarnings = rides.reduce(
      (total, ride) => total + (ride.fare || 0),
      0
    )

    const ratings = rides
      .filter(
        (ride) =>
          Number.isInteger(ride.rating) &&
          ride.rating >= 1 &&
          ride.rating <= 5
      )
      .map((ride) => ride.rating)

    const averageRating = ratings.length
      ? Number(
          (
            ratings.reduce((total, rating) => total + rating, 0) /
            ratings.length
          ).toFixed(1)
        )
      : 0

      
const now = new Date()

const todayStart = new Date(now)
todayStart.setHours(0, 0, 0, 0)

const tomorrowStart = new Date(todayStart)
tomorrowStart.setDate(tomorrowStart.getDate() + 1)

const monthStart = new Date(
  now.getFullYear(),
  now.getMonth(),
  1
)

const dailyEarnings = rides.reduce((total, ride) => {
  const rideDate = new Date(ride.createdAt)

  return rideDate >= todayStart && rideDate < tomorrowStart
    ? total + (ride.fare || 0)
    : total
}, 0)

const monthlyEarnings = rides.reduce((total, ride) => {
  const rideDate = new Date(ride.createdAt)

  return rideDate >= monthStart
    ? total + (ride.fare || 0)
    : total
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
      }
    })
  } catch (error) {
    console.error('Get driver ride history error:', error.message)

    return res.status(500).json({
      message: 'Unable to fetch ride history.'
    })
  }
}







export const getDriverStats = async (req, res) => {
  try {
    const driverId = req.user.userId

    const [
      availableRides,
      completedRides,
      ratingStats,
    ] = await Promise.all([
      Ride.countDocuments({
        status: 'requested',
        driver: null,
      }),

      Ride.find({
        driver: driverId,
        status: 'completed',
      }).select('fare paymentMethod paymentStatus'),

      Ride.aggregate([
        {
          $match: {
            driver: new mongoose.Types.ObjectId(driverId),
            status: 'completed',
            rating: { $gte: 1, $lte: 5 },
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ])

    const totalCompletedFare = completedRides.reduce(
      (total, ride) => total + (Number(ride.fare) || 0),
      0
    )

    const onlinePaidRides = completedRides.filter(
      (ride) =>
        ride.paymentMethod !== 'Cash' &&
        ride.paymentStatus === 'Paid'
    )

    const cashRides = completedRides.filter(
      (ride) => ride.paymentMethod === 'Cash'
    )

    const onlinePaymentsCollected = onlinePaidRides.reduce(
      (total, ride) => total + (Number(ride.fare) || 0),
      0
    )

    const cashPaymentsExpected = cashRides.reduce(
      (total, ride) => total + (Number(ride.fare) || 0),
      0
    )

    const averageRating = ratingStats.length
      ? Number(ratingStats[0].averageRating.toFixed(1))
      : 0

    const totalReviews = ratingStats.length
      ? ratingStats[0].totalReviews
      : 0

    return res.status(200).json({
      availableRequests: availableRides,
      completedRides: completedRides.length,

      // Total fare of all completed rides.
      totalEarnings: totalCompletedFare,

      // Payment breakdown.
      onlinePaymentsCollected,
      cashPaymentsExpected,

      // Completed rides that are not yet paid online.
      unpaidOnlineRides: completedRides.filter(
        (ride) =>
          ride.paymentMethod !== 'Cash' &&
          ride.paymentStatus !== 'Paid'
      ).length,

      averageRating,
      totalReviews,
    })
  } catch (error) {
    console.error('Get driver stats error:', error.message)

    return res.status(500).json({
      message: 'Unable to fetch driver statistics.',
    })
  }
}




export const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        user: req.user.userId,
        status: 'requested',
        driver: null,
      },
      {
        $set: { status: 'cancelled' },
      },
      { new: true, runValidators: true }
    )

    if (!ride) {
      return res.status(400).json({
        message:
          'Ride cannot be cancelled. It may already be accepted, completed, or cancelled.',
      })
    }

    return res.status(200).json({
      message: 'Ride cancelled successfully',
      ride,
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid ride ID',
      })
    }

    console.error('Cancel ride error:', error)

    return res.status(500).json({
      message: 'Server error while cancelling ride',
    })
  }
}


export const rateRide = async (req, res) => {
  try {
    const { rideId } = req.params
    const { rating, review = '' } = req.body

    const parsedRating = Number(rating)

    if (
      !Number.isInteger(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5 stars',
      })
    }

    if (typeof review !== 'string' || review.length > 500) {
      return res.status(400).json({
        message: 'Review must be 500 characters or fewer',
      })
    }

    const ride = await Ride.findOne({
      _id: rideId,
      user: req.user.userId,
    })

    if (!ride) {
      return res.status(404).json({
        message: 'Ride not found',
      })
    }

    if (ride.status !== 'completed') {
      return res.status(400).json({
        message: 'You can rate a ride only after it is completed',
      })
    }

    if (ride.rating !== null && ride.rating !== undefined) {
      return res.status(400).json({
        message: 'You have already rated this ride',
      })
    }

    ride.rating = parsedRating
    ride.review = review.trim()
    ride.ratedAt = new Date()

    await ride.save()

    return res.status(200).json({
      message: 'Rating submitted successfully',
      ride: {
        _id: ride._id,
        rating: ride.rating,
        review: ride.review,
        ratedAt: ride.ratedAt,
      },
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid ride ID',
      })
    }

    console.error('Rate ride error:', error)

    return res.status(500).json({
      message: 'Unable to submit rating',
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
        message: 'Valid latitude and longitude are required.'
      })
    }

    const ride = await Ride.findOne({
      _id: rideId,
      driver: req.user.userId,
      status: { $in: ['accepted', 'ongoing'] }
    })

    if (!ride) {
      return res.status(404).json({
        message: 'Active ride not found or not assigned to you.'
      })
    }

    ride.driverLocation = {
      latitude,
      longitude,
      updatedAt: new Date()
    }

    await ride.save()

    return res.status(200).json({
      message: 'Driver location updated successfully.',
      driverLocation: ride.driverLocation
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid ride ID.'
      })
    }

    console.error('Update driver location error:', error.message)

    return res.status(500).json({
      message: 'Unable to update driver location.'
    })
  }
}


export const getDriverLocation = async (req, res) => {
  try {
    const { rideId } = req.params

    const ride = await Ride.findOne({
      _id: rideId,
      user: req.user.userId,
      status: { $in: ['accepted', 'ongoing'] }
    }).select('driver driverLocation status')

    if (!ride) {
      return res.status(404).json({
        message: 'Active ride not found.'
      })
    }

    if (!ride.driver) {
      return res.status(404).json({
        message: 'No driver assigned to this ride yet.'
      })
    }

    return res.status(200).json({
      status: ride.status,
      driverLocation: ride.driverLocation
    })
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid ride ID.'
      })
    }

    console.error('Get driver location error:', error.message)

    return res.status(500).json({
      message: 'Unable to fetch driver location.'
    })
  }
}
