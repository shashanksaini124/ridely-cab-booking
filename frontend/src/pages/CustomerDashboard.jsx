
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CarFront,
  Clock3,
  MapPin,
  LogOut,
  RefreshCw,
} from 'lucide-react'

import 'leaflet/dist/leaflet.css'
import DriverLiveMap from '../components/DriverLiveMap'

const API_URL = `${import.meta.env.VITE_API_URL}/api/rides`
const PAYMENT_API_URL = `${import.meta.env.VITE_API_URL}/api/payments`

function CustomerDashboard() {
  const navigate = useNavigate()

  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [paymentMessage, setPaymentMessage] = useState('')
  const [paymentMessageType, setPaymentMessageType] = useState('success')
  const [paymentLoadingId, setPaymentLoadingId] = useState('')

  const [ratingValues, setRatingValues] = useState({})
  const [reviewValues, setReviewValues] = useState({})
  const [ratingMessages, setRatingMessages] = useState({})
  const [ratingLoadingId, setRatingLoadingId] = useState('')

  const [trackedRideId, setTrackedRideId] = useState('')
  const [driverLocation, setDriverLocation] = useState(null)

  const rideStatuses = [
    { value: 'requested', label: 'Ride Requested' },
    { value: 'accepted', label: 'Driver Accepted' },
    { value: 'ongoing', label: 'Ride Ongoing' },
    { value: 'completed', label: 'Ride Completed' },
  ]

  function getStatusIndex(status) {
    return rideStatuses.findIndex((item) => item.value === status)
  }

  const fetchRides = useCallback(async (signal) => {
    const token = localStorage.getItem('ridelyToken')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    try {
      setError('')

      const response = await fetch(`${API_URL}/my-rides`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal,
      })

      const data = await response.json()

      if (response.status === 401) {
        localStorage.removeItem('ridelyToken')
        localStorage.removeItem('ridelyUser')
        navigate('/login', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load ride history.')
      }

      setRides(Array.isArray(data.rides) ? data.rides : [])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Could not connect to the server.')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [navigate])

  const fetchDriverLocation = useCallback(async (rideId) => {
    const token = localStorage.getItem('ridelyToken')

    if (!token || !rideId) return

    try {
      const response = await fetch(`${API_URL}/${rideId}/location`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to fetch driver location.')
      }

      setDriverLocation(data.driverLocation || null)
    } catch (err) {
      console.error('Driver location error:', err.message)
    }
  }, [])

  const activeRide = rides.find(
    (ride) =>
      ['accepted', 'ongoing'].includes(ride.status) && ride.driver
  )

  const activeRideId = activeRide?._id || ''

  useEffect(() => {
    const controller = new AbortController()

    fetchRides(controller.signal)

    const intervalId = setInterval(() => {
      fetchRides()
    }, 10000)

    return () => {
      controller.abort()
      clearInterval(intervalId)
    }
  }, [fetchRides])

  useEffect(() => {
    if (!activeRideId) {
      setTrackedRideId('')
      setDriverLocation(null)
      return
    }

    setTrackedRideId(activeRideId)
    fetchDriverLocation(activeRideId)

    const intervalId = setInterval(() => {
      fetchDriverLocation(activeRideId)
    }, 5000)

    return () => clearInterval(intervalId)
  }, [activeRideId, fetchDriverLocation])

  function handleLogout() {
    localStorage.removeItem('ridelyToken')
    localStorage.removeItem('ridelyUser')
    navigate('/login', { replace: true })
  }

  async function handleCancelRide(rideId) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this ride?'
    )

    if (!confirmed) return

    const token = localStorage.getItem('ridelyToken')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    try {
      const response = await fetch(`${API_URL}/${rideId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel ride.')
      }

      window.alert('Ride cancelled successfully!')
      await fetchRides()
    } catch (err) {
      window.alert(err.message || 'Something went wrong.')
    }
  }

  async function handlePayNow(ride) {
    const token = localStorage.getItem('ridelyToken')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    if (paymentLoadingId) return

    setPaymentMessage('')
    setPaymentLoadingId(ride._id)

    try {
      if (!window.Razorpay) {
        throw new Error(
          'Razorpay Checkout script is not loaded. Please refresh the page.'
        )
      }

      // Step 1: Create a payment order on the backend.
      const orderResponse = await fetch(
        `${PAYMENT_API_URL}/create-order`,
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

      if (!orderResponse.ok) {
        throw new Error(
          orderData.message || 'Could not create payment order.'
        )
      }

      if (
        !orderData.keyId ||
        !orderData.orderId ||
        !orderData.amount
      ) {
        throw new Error('Invalid payment order returned by the server.')
      }

      // Step 2: Open Razorpay Checkout.
      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Ridely',
        description: `Ride payment - ${ride._id}`,
        order_id: orderData.orderId,
        theme: {
          color: '#84cc16',
        },

        // Step 3: Verify the payment on the backend.
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch(
              `${PAYMENT_API_URL}/verify`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  rideId: ride._id,
                  razorpay_order_id:
                    paymentResponse.razorpay_order_id,
                  razorpay_payment_id:
                    paymentResponse.razorpay_payment_id,
                  razorpay_signature:
                    paymentResponse.razorpay_signature,
                }),
              }
            )

            const verifyData = await verifyResponse.json()

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData.message || 'Payment verification failed.'
              )
            }

            setPaymentMessageType('success')
            setPaymentMessage(
              verifyData.message || 'Payment verified successfully!'
            )

            await fetchRides()
          } catch (err) {
            setPaymentMessageType('error')
            setPaymentMessage(
              err.message ||
                'Payment verification failed. Check your payment status before retrying.'
            )
          } finally {
            setPaymentLoadingId('')
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentLoadingId('')
            setPaymentMessageType('error')
            setPaymentMessage(
              'Payment window closed. Check the ride payment status before retrying.'
            )
          },
        },
      })

      checkout.on('payment.failed', (event) => {
        setPaymentLoadingId('')
        setPaymentMessageType('error')
        setPaymentMessage(
          event.error?.description ||
            'Payment failed. Please try again.'
        )
      })

      checkout.open()
    } catch (err) {
      setPaymentLoadingId('')
      setPaymentMessageType('error')
      setPaymentMessage(
        err.message || 'Could not start payment.'
      )
    }
  }

  async function handleRateRide(rideId) {
    const rating = Number(ratingValues[rideId])
    const review = reviewValues[rideId] || ''

    if (!rating || rating < 1 || rating > 5) {
      setRatingMessages((prev) => ({
        ...prev,
        [rideId]: 'Please select a star rating.',
      }))
      return
    }

    const token = localStorage.getItem('ridelyToken')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setRatingLoadingId(rideId)

    setRatingMessages((prev) => ({
      ...prev,
      [rideId]: '',
    }))

    try {
      const response = await fetch(
        `${API_URL}/${rideId}/rating`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating, review }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to submit rating.')
      }

      setRatingMessages((prev) => ({
        ...prev,
        [rideId]: 'Thank you! Your rating has been submitted.',
      }))

      await fetchRides()
    } catch (err) {
      setRatingMessages((prev) => ({
        ...prev,
        [rideId]: err.message || 'Unable to submit rating.',
      }))
    } finally {
      setRatingLoadingId('')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="text-sm font-semibold text-lime-700">
            ← Back to home
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        <h1 className="mt-6 text-3xl font-extrabold text-gray-950">
          Your dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your rides from one place.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/#book"
            className="rounded-2xl border bg-white p-6 transition hover:border-lime-400 hover:shadow-lg"
          >
            <CarFront className="text-lime-700" size={28} />
            <h2 className="mt-5 font-bold">Book a ride</h2>
            <p className="mt-2 text-sm text-gray-500">
              Choose your pickup and destination.
            </p>
          </Link>

          <a
            href="#ride-history"
            className="rounded-2xl border bg-white p-6 transition hover:border-lime-400 hover:shadow-lg"
          >
            <Clock3 className="text-lime-700" size={28} />
            <h2 className="mt-5 font-bold">Ride history</h2>
            <p className="mt-2 text-sm text-gray-500">
              {rides.length} ride{rides.length === 1 ? '' : 's'} found.
            </p>
          </a>

          <div className="rounded-2xl border bg-white p-6">
            <MapPin className="text-lime-700" size={28} />
            <h2 className="mt-5 font-bold">Saved places</h2>
            <p className="mt-2 text-sm text-gray-500">
              Saved locations can be added later.
            </p>
          </div>
        </div>

        {paymentMessage && (
          <div
            role="status"
            className={`mt-6 rounded-xl border p-4 text-sm ${
              paymentMessageType === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {paymentMessage}
          </div>
        )}

        <section id="ride-history" className="mt-10">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold text-gray-950">
              Your rides
            </h2>

            <button
              type="button"
              onClick={() => fetchRides()}
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-100"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">
              Loading your rides...
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
              {error}
            </div>
          ) : rides.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-gray-500">
              No rides yet. Book your first ride to see it here.
            </div>
          ) : (
            <div className="space-y-4">
              {rides.map((ride) => (
                <article
                  key={ride._id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-950">
                        {ride.rideType}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            Total Ride Fare
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {ride.rideType} · Estimated fare
                          </p>
                        </div>

                        <p className="text-2xl font-extrabold text-green-700">
                          ₹{Number(ride.fare ?? 0).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-gray-900">
                              Payment Details
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Method: {ride.paymentMethod || 'Cash'}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              ride.paymentStatus === 'Paid'
                                ? 'bg-green-100 text-green-700'
                                : ride.paymentStatus === 'Failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ride.paymentStatus || 'Pending'}
                          </span>
                        </div>

                        <div className="mt-3 border-t border-gray-100 pt-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-500">
                              Amount
                            </span>
                            <span className="font-bold text-gray-900">
                              ₹{Number(ride.fare ?? 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {ride.paymentStatus === 'Paid' &&
                            ride.paymentPaidAt && (
                              <div className="mt-2 flex items-start justify-between gap-3">
                                <span className="text-sm text-gray-500">
                                  Paid on
                                </span>
                                <span className="text-right text-sm text-gray-700">
                                  {new Date(
                                    ride.paymentPaidAt
                                  ).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                        </div>
                      </div>

                      {ride.paymentMethod !== 'Cash' &&
                        ride.paymentStatus !== 'Paid' &&
                        ride.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handlePayNow(ride)}
                            disabled={Boolean(paymentLoadingId)}
                            className="mt-3 w-full rounded-xl bg-lime-300 px-4 py-3 font-bold text-gray-950 hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {paymentLoadingId === ride._id
                              ? 'Processing payment...'
                              : 'Pay Now'}
                          </button>
                        )}

                      <p className="mt-3 text-xs text-gray-500">
                        {ride.createdAt
                          ? new Date(ride.createdAt).toLocaleString()
                          : 'Date unavailable'}
                      </p>
                    </div>

                    <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-bold capitalize text-lime-800">
                      {ride.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-3 w-3 rounded-full bg-lime-500" />
                      <div>
                        <p className="text-xs text-gray-500">Pickup</p>
                        <p className="font-medium text-gray-800">
                          {ride.pickup}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-3 w-3 rounded-full bg-gray-800" />
                      <div>
                        <p className="text-xs text-gray-500">Destination</p>
                        <p className="font-medium text-gray-800">
                          {ride.destination}
                        </p>
                      </div>
                    </div>
                  </div>

                  {ride.driver && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                          <CarFront size={22} />
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Your Driver
                          </p>
                          <p className="font-semibold text-gray-900">
                            {ride.driver.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Driver assigned
                          </p>

                          {ride.driver.phone ? (
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <p className="text-sm text-gray-700">
                                {ride.driver.phone}
                              </p>
                              <a
                                href={`tel:${ride.driver.phone}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                              >
                                Call Driver
                              </a>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-gray-500">
                              Driver contact number not available
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {ride._id === trackedRideId &&
                    ['accepted', 'ongoing'].includes(ride.status) && (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {ride.status === 'ongoing'
                                ? "You're on your ride"
                                : 'Your driver is on the way'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {ride.status === 'ongoing'
                                ? 'Your trip to the destination is in progress.'
                                : 'Your driver is heading to your pickup location.'}
                            </p>
                          </div>

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            Live
                          </span>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-blue-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Vehicle type</p>
                            <p className="mt-1 font-bold text-gray-900">
                              {ride.rideType === 'Bike'
                                ? '🏍️ Bike'
                                : ride.rideType === 'Three-Wheeler'
                                  ? '🛺 Three-Wheeler'
                                  : '🚗 Car'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-blue-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Ride status</p>
                            <p className="mt-1 font-bold capitalize text-gray-900">
                              {ride.status}
                            </p>
                          </div>

                          <div className="col-span-2 rounded-xl border border-blue-100 bg-white p-4">
                            <p className="text-xs text-gray-500">Pickup location</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {ride.pickup}
                            </p>
                            <div className="my-3 border-t border-gray-100" />
                            <p className="text-xs text-gray-500">Destination</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {ride.destination}
                            </p>
                          </div>
                        </div>

                        <DriverLiveMap
                          latitude={driverLocation?.latitude}
                          longitude={driverLocation?.longitude}
                          pickupCoordinates={ride.pickupCoordinates}
                          destinationCoordinates={ride.destinationCoordinates}
                          rideStatus={ride.status}
                          rideType={ride.rideType}
                        />

                        {driverLocation?.latitude != null &&
                        driverLocation?.longitude != null ? (
                          <>
                            <p className="mt-2 text-sm text-gray-700">
                              Latitude: {driverLocation.latitude}
                            </p>
                            <p className="text-sm text-gray-700">
                              Longitude: {driverLocation.longitude}
                            </p>
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${driverLocation.latitude}&mlon=${driverLocation.longitude}#map=16/${driverLocation.latitude}/${driverLocation.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                            >
                              View Driver on Map
                            </a>
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-gray-600">
                            Waiting for driver GPS location...
                          </p>
                        )}
                      </div>
                    )}

                  <div className="mt-6 border-t border-gray-200 pt-5">
                    <h4 className="mb-4 text-sm font-semibold text-gray-700">
                      Ride Progress
                    </h4>

                    {ride.status === 'completed' && (
                      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                        <h4 className="text-base font-bold text-gray-900">
                          Rate Your Ride
                        </h4>

                        {ride.rating ? (
                          <div className="mt-3">
                            <div className="flex items-center gap-1 text-amber-500">
                              {Array.from({ length: 5 }, (_, index) => (
                                <span key={index} className="text-xl">
                                  {index < ride.rating ? '★' : '☆'}
                                </span>
                              ))}
                              <span className="ml-2 text-sm font-semibold text-gray-700">
                                {ride.rating}/5
                              </span>
                            </div>

                            {ride.review && (
                              <p className="mt-2 text-sm text-gray-600">
                                {ride.review}
                              </p>
                            )}

                            <p className="mt-2 text-xs text-green-700">
                              Thanks for your feedback!
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="mt-1 text-sm text-gray-600">
                              How was your experience with the driver?
                            </p>

                            <div
                              className="mt-4 flex gap-2"
                              role="group"
                              aria-label="Choose a rating"
                            >
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                  aria-pressed={
                                    Number(ratingValues[ride._id]) === star
                                  }
                                  onClick={() =>
                                    setRatingValues((prev) => ({
                                      ...prev,
                                      [ride._id]: star,
                                    }))
                                  }
                                  className={`text-3xl transition hover:scale-110 ${
                                    Number(ratingValues[ride._id]) >= star
                                      ? 'text-amber-500'
                                      : 'text-gray-300'
                                  }`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>

                            <textarea
                              value={reviewValues[ride._id] || ''}
                              onChange={(event) =>
                                setReviewValues((prev) => ({
                                  ...prev,
                                  [ride._id]: event.target.value.slice(0, 500),
                                }))
                              }
                              maxLength={500}
                              rows={3}
                              placeholder="Write a review (optional)"
                              className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400"
                            />

                            <p className="mt-1 text-right text-xs text-gray-500">
                              {(reviewValues[ride._id] || '').length}/500
                            </p>

                            {ratingMessages[ride._id] && (
                              <p role="status" className="mt-3 text-sm text-gray-700">
                                {ratingMessages[ride._id]}
                              </p>
                            )}

                            <button
                              type="button"
                              disabled={ratingLoadingId === ride._id}
                              onClick={() => handleRateRide(ride._id)}
                              className="mt-4 w-full rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-gray-950 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ratingLoadingId === ride._id
                                ? 'Submitting...'
                                : 'Submit Rating'}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {ride.status === 'cancelled' ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="font-semibold text-red-700">
                          Ride Cancelled
                        </p>
                        <p className="mt-1 text-sm text-red-600">
                          This ride was cancelled before the driver accepted it.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {rideStatuses.map((step, index) => {
                          const currentIndex = getStatusIndex(ride.status)
                          const isCompleted = currentIndex >= index
                          const isCurrent = currentIndex === index

                          return (
                            <div
                              key={step.value}
                              className="flex items-center gap-3"
                            >
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                                  isCompleted
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-300 bg-white text-gray-400'
                                }`}
                              >
                                {isCompleted ? '✓' : index + 1}
                              </div>

                              <div>
                                <p
                                  className={`text-sm ${
                                    isCurrent
                                      ? 'font-semibold text-green-700'
                                      : isCompleted
                                        ? 'text-gray-800'
                                        : 'text-gray-400'
                                  }`}
                                >
                                  {step.label}
                                </p>

                                {isCurrent && (
                                  <p className="text-xs text-gray-500">
                                    Current status
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {ride.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => handleCancelRide(ride._id)}
                      className="mt-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Cancel Ride
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default CustomerDashboard
