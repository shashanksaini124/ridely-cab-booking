
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navigation, ArrowRight } from 'lucide-react'
import LocationFields from './LocationFields'
import RideOptions from './RideOptions'

const API_URL = import.meta.env.VITE_API_URL

function BookingCard() {
  const navigate = useNavigate()

  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [rideType, setRideType] = useState('Uber Go')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [pickupCoords, setPickupCoords] = useState(null)
  const [destinationCoords, setDestinationCoords] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)
  const [calculatingDistance, setCalculatingDistance] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('Cash')

  useEffect(() => {
    let cancelled = false

    async function calculateRoadDistance() {
      if (!pickupCoords || !destinationCoords) {
        setDistanceKm(null)
        setCalculatingDistance(false)
        return
      }

      try {
        setCalculatingDistance(true)
        setDistanceKm(null)
        setMessage('')

        const { latitude: lat1, longitude: lon1 } = pickupCoords
        const { latitude: lat2, longitude: lon2 } = destinationCoords

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${lon1},${lat1};${lon2},${lat2}?overview=false`

        const response = await fetch(url)
        const data = await response.json()

        if (
          !response.ok ||
          data.code !== 'Ok' ||
          !data.routes?.length
        ) {
          throw new Error('Could not calculate the road distance.')
        }

        if (!cancelled) {
          setDistanceKm(data.routes[0].distance / 1000)
        }
      } catch (error) {
        if (!cancelled) {
          setDistanceKm(null)
          setMessage(error.message || 'Distance calculate nahi ho payi.')
        }
      } finally {
        if (!cancelled) {
          setCalculatingDistance(false)
        }
      }
    }

    calculateRoadDistance()

    return () => {
      cancelled = true
    }
  }, [pickupCoords, destinationCoords])

  async function handleBooking() {
    setMessage('')

    if (!pickup.trim() || !destination.trim()) {
      setMessage('Please enter both pickup and destination.')
      return
    }

    if (pickup.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setMessage('Pickup and destination must be different.')
      return
    }

    if (!pickupCoords || !destinationCoords) {
      setMessage('Please select pickup and destination from suggestions.')
      return
    }

    if (
      distanceKm === null ||
      !Number.isFinite(distanceKm) ||
      distanceKm <= 0 ||
      calculatingDistance
    ) {
      setMessage('Please wait until the road distance is calculated.')
      return
    }

    const token = localStorage.getItem('ridelyToken')

    if (!token) {
      navigate('/login')
      return
    }

    try {
      setLoading(true)

      // Step 1: Create the ride using the existing booking API.
      const rideResponse = await fetch(`${API_URL}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickup: pickup.trim(),
          destination: destination.trim(),
          rideType,
          pickupCoordinates: pickupCoords,
          destinationCoordinates: destinationCoords,
          distanceKm,
          paymentMethod,
        }),
      })

      const rideData = await rideResponse.json()

      if (rideResponse.status === 401) {
        localStorage.removeItem('ridelyToken')
        localStorage.removeItem('ridelyUser')
        navigate('/login', { replace: true })
        return
      }

      if (!rideResponse.ok) {
        throw new Error(rideData.message || 'Unable to book your ride.')
      }

      const ride = rideData.ride

      if (!ride?._id) {
        throw new Error(
          'Ride was created, but the server did not return its ID.'
        )
      }

      // Cash rides do not need Razorpay.
      if (paymentMethod === 'Cash') {
        setMessage(
          `Ride requested successfully! ${ride.pickup} → ${ride.destination}. Status: ${ride.status}. Payment: Cash.`
        )
        return
      }

      // Step 2: Make sure Razorpay Checkout is available.
      if (!window.Razorpay) {
        setMessage(
          `Ride created (${ride._id}), but Razorpay Checkout could not load. Please retry payment from your ride details.`
        )
        return
      }

      // Step 3: Create the payment order on the backend.
      const orderResponse = await fetch(
        `${API_URL}/api/payments/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rideId: ride._id,
          }),
        }
      )

      const orderData = await orderResponse.json()

      if (orderResponse.status === 401) {
        localStorage.removeItem('ridelyToken')
        localStorage.removeItem('ridelyUser')
        navigate('/login', { replace: true })
        return
      }

      if (!orderResponse.ok) {
        throw new Error(
          `Ride created (${ride._id}), but payment order failed: ${
            orderData.message || 'Please retry payment.'
          }`
        )
      }

      if (!orderData.keyId || !orderData.orderId) {
        throw new Error(
          `Ride created (${ride._id}), but payment order details are incomplete.`
        )
      }

      // Step 4: Open Razorpay Checkout.
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Ridely',
        description: `Ride payment - ${ride._id}`,
        order_id: orderData.orderId,

        prefill: {
          name: localStorage.getItem('ridelyUser')
            ? JSON.parse(localStorage.getItem('ridelyUser')).name || ''
            : '',
        },

        notes: {
          rideId: ride._id,
        },

        theme: {
          color: '#84cc16',
        },

        handler: async function (paymentResponse) {
          try {
            setLoading(true)
            setMessage('Payment received. Verifying securely...')

            const verifyResponse = await fetch(
              `${API_URL}/api/payments/verify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  rideId: ride._id,
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                }),
              }
            )

            const verifyData = await verifyResponse.json()

            if (verifyResponse.status === 401) {
              localStorage.removeItem('ridelyToken')
              localStorage.removeItem('ridelyUser')
              navigate('/login', { replace: true })
              return
            }

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message || 'Payment verification failed.'
              )
            }

            setMessage(
              `Payment successful and verified! Ride ID: ${ride._id}.`
            )
          } catch (error) {
            setMessage(
              `Payment submitted, but verification needs attention. Ride ID: ${ride._id}. ${error.message}`
            )
          } finally {
            setLoading(false)
          }
        },

        modal: {
          ondismiss: function () {
            setLoading(false)
            setMessage(
              `Payment window closed. Your ride (${ride._id}) was created, but payment is still pending.`
            )
          },
        },
      }

      const checkout = new window.Razorpay(options)

      checkout.on('payment.failed', function (response) {
        setLoading(false)
        setMessage(
          `Payment failed: ${
            response.error?.description || 'Please try again.'
          } Ride ID: ${ride._id}.`
        )
      })

      checkout.open()
    } catch (error) {
      setMessage(error.message || 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      id="book" 
      className="w-full rounded-3xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/60 sm:p-7"
    >
      <div className="mb-7 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold tracking-[2px] text-lime-700">
            PLAN YOUR JOURNEY
          </span>

          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-950">
            Where to?
          </h2>
        </div>

        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lime-100 text-lime-700">
          <Navigation size={23} />
        </span>
      </div>

      <LocationFields
        pickup={pickup}
        setPickup={setPickup}
        destination={destination}
        setDestination={setDestination}
        setMessage={setMessage}
        onPickupCoordsChange={(coords) => {
          setPickupCoords(coords)
          setDistanceKm(null)
        }}
        onDestinationCoordsChange={(coords) => {
          setDestinationCoords(coords)
          setDistanceKm(null)
        }}
      />

      {calculatingDistance && (
        <p className="mt-2 text-sm text-gray-500">
          Calculating road distance...
        </p>
      )}

      {distanceKm !== null && (
        <p className="mt-2 text-sm text-gray-600">
          Road distance: {distanceKm.toFixed(1)} km
          {' · '}
          Estimated fare: ₹{Math.ceil(distanceKm * 5)}
        </p>
      )}

      <RideOptions
        rideType={rideType}
        setRideType={setRideType}
        setMessage={setMessage}
        distanceKm={distanceKm}
      />

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Choose Payment Method
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'Cash', label: 'Cash', icon: '💵' },
            { value: 'UPI', label: 'UPI', icon: '📱' },
            { value: 'Online', label: 'Online', icon: '💳' },
          ].map((method) => (
            <button
              key={method.value}
              type="button"
              disabled={loading}
              onClick={() => {
                setPaymentMethod(method.value)
                setMessage('')
              }}
              className={`rounded-xl border p-3 text-center transition disabled:opacity-60 ${
                paymentMethod === method.value
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <span className="block text-xl">{method.icon}</span>

              <span className="mt-1 block text-sm font-semibold text-gray-800">
                {method.label}
              </span>

              {paymentMethod === method.value && (
                <span className="mt-1 block text-xs text-blue-700">
                  Selected
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleBooking}
        disabled={loading || calculatingDistance}
        className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-lime-300 px-5 py-4 font-bold text-gray-950 transition hover:bg-lime-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? 'Processing...'
          : paymentMethod === 'Cash'
            ? 'Find a ride'
            : 'Book & Pay'}
        {!loading && <ArrowRight size={19} />}
      </button>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 break-words rounded-xl bg-lime-50 p-3 text-sm leading-6 text-gray-700"
        >
          {message}
        </p>
      )}
    </div>
  )
}

export default BookingCard
