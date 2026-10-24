
import mongoose from 'mongoose'

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pickup: {
      type: String,
      required: true,
      trim: true
    },
    destination: {
      type: String,
      required: true,
      trim: true
    },
    
    pickupCoordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },

    destinationCoordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      }
    },

    distanceKm: {
      type: Number,
      required: true,
      min: 0.01,
      max: 1000
    },

    rideType: {
      type: String,
      enum: ['Bike', 'Three-Wheeler', 'Car'],
      required: true
    },
    
fare: {
  type: Number,
  required: true,
  min: 0
},


rating: {
  type: Number,
  min: 1,
  max: 5,
  default: null,
},
review: {
  type: String,
  trim: true,
  maxlength: 500,
  default: '',
},
ratedAt: {
  type: Date,
  default: null,
},


    status: {
      type: String,
      enum: ['requested', 'accepted', 'ongoing', 'completed', 'cancelled'],
      default: 'requested'
    },
    
driver: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
},

driverLocation: {
  latitude: {
    type: Number,
    min: -90,
    max: 90,
    default: null
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180,
    default: null
  },
  updatedAt: {
    type: Date,
    default: null
  }
},

paymentMethod: {
  type: String,
  enum: ['Cash', 'UPI', 'Online'],
  default: 'Cash',
  required: true,
},

paymentStatus: {
  type: String,
  enum: ['Pending', 'Paid', 'Failed'],
  default: 'Pending',
  required: true,
},

paymentTransactionId: {
  type: String,
  default: null,
},

paymentPaidAt: {
  type: Date,
  default: null,
},




  },
  { timestamps: true }
)

const Ride = mongoose.model('Ride', rideSchema)

export default Ride
