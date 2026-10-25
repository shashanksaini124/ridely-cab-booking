
  import { useCallback, useEffect, useState , useRef } from 'react'
  import { Link } from 'react-router-dom'
  import {
    CarFront,
    Clock3,
    IndianRupee,
    MapPin,
    RefreshCw,
    Star,
    MessageSquare,
  } from 'lucide-react'

  import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    Polyline
  } from 'react-leaflet'
  import L from 'leaflet'

  
const vehicleIconUrls = {
  Bike: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
  'Three-Wheeler': 'https://cdn-icons-png.flaticon.com/512/1048/1048314.png',
  Car: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png',
}


function createVehicleIcon(rideType, heading = 0) {
  const vehicles = {
    Bike: '🏍️',
    'Three-Wheeler': '🛺',
    Car: '🚗',
  }

  const emoji = vehicles[rideType] || '🚗'

  return L.divIcon({
    className: 'ridely-vehicle-marker',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border: 2px solid #2563eb;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        font-size: 25px;
        transform: rotate(${heading}deg);
      ">
        ${emoji}
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}



const API_URL = `${import.meta.env.VITE_API_URL}/api/rides`

  
const pickupIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const destinationIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function RideMapUpdater({ points }) {
  const map = useMap()

  useEffect(() => {
    const validPoints = points.filter(
      ([lat, lng]) =>
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    )

    if (validPoints.length > 1) {
      map.fitBounds(validPoints, {
        padding: [35, 35],
        maxZoom: 15,
      })
    } else if (validPoints.length === 1) {
      map.setView(validPoints[0], 15)
    }
  }, [
  map,
  JSON.stringify(points),
])

  return null
}


function DriverRideMap({ ride }) {
  const [driverPosition, setDriverPosition] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeDistanceKm, setRouteDistanceKm] = useState(null)
  const [routeDurationMin, setRouteDurationMin] = useState(null)
  const [mapError, setMapError] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  
const [heading, setHeading] = useState(0)
const [previousPosition, setPreviousPosition] = useState(null)


  const pickup = ride.pickupCoordinates
  const destination = ride.destinationCoordinates
  const isOngoing = ride.status === 'ongoing'

  const validCoords = (coords) => {
    if (!coords) return false

    const lat = Number(coords.latitude)
    const lng = Number(coords.longitude)

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    )
  }

  // Get the driver's current GPS location.
  useEffect(() => {
    if (!navigator.geolocation) {
      setMapError('This browser does not support GPS.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        
const newPosition = {
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
}

if (position.coords.heading != null) {
  setHeading(position.coords.heading)
} else if (previousPosition) {
  const lat1 = previousPosition.latitude * Math.PI / 180
  const lat2 = newPosition.latitude * Math.PI / 180
  const deltaLng =
    (newPosition.longitude - previousPosition.longitude) * Math.PI / 180

  const y = Math.sin(deltaLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)

  const bearing =
    (Math.atan2(y, x) * 180 / Math.PI + 360) % 360

  setHeading(bearing)
}

setPreviousPosition(newPosition)
setDriverPosition(newPosition)

        setDriverPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setMapError('')
      },
      (error) => {
        setMapError(
          error.code === 1
            ? 'Allow location permission to show your current position.'
            : 'Unable to get GPS location. Check your device location settings.'
        )
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Accepted: driver -> pickup.
  // Ongoing: pickup -> destination.
  useEffect(() => {
    const start = isOngoing ? pickup : driverPosition
    const end = isOngoing ? destination : pickup

    if (!validCoords(start) || !validCoords(end)) {
      setRouteCoordinates([])
      setRouteDistanceKm(null)
      setRouteDurationMin(null)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setRouteLoading(true)

      try {
        const url =
          'https://router.project-osrm.org/route/v1/driving/' +
          `${Number(start.longitude)},${Number(start.latitude)};` +
          `${Number(end.longitude)},${Number(end.latitude)}` +
          '?overview=full&geometries=geojson'

        const response = await fetch(url, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Route request failed.')
        }

        const data = await response.json()

        if (data.code !== 'Ok' || !data.routes?.length) {
          throw new Error('No driving route found.')
        }

        const route = data.routes[0]

        setRouteCoordinates(
          route.geometry.coordinates.map(
            ([longitude, latitude]) => [latitude, longitude]
          )
        )
        setRouteDistanceKm(route.distance / 1000)
        setRouteDurationMin(route.duration / 60)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Driver route error:', error.message)
          setRouteCoordinates([])
          setRouteDistanceKm(null)
          setRouteDurationMin(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false)
        }
      }
    }, 1200)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [
    driverPosition?.latitude,
    driverPosition?.longitude,
    pickup?.latitude,
    pickup?.longitude,
    destination?.latitude,
    destination?.longitude,
    isOngoing,
  ])

  const target = isOngoing ? destination : pickup

  const googleMapsUrl = validCoords(target)
    ? `https://www.google.com/maps/dir/?api=1&destination=${Number(target.latitude)},${Number(target.longitude)}&travelmode=driving`
    : ''

  const mapCenter = validCoords(driverPosition)
    ? [Number(driverPosition.latitude), Number(driverPosition.longitude)]
    : validCoords(pickup)
      ? [Number(pickup.latitude), Number(pickup.longitude)]
      : validCoords(destination)
        ? [Number(destination.latitude), Number(destination.longitude)]
        : [28.6139, 77.2090]

  const mapPoints = [
    ...(validCoords(driverPosition)
      ? [[Number(driverPosition.latitude), Number(driverPosition.longitude)]]
      : []),
    ...(validCoords(pickup)
      ? [[Number(pickup.latitude), Number(pickup.longitude)]]
      : []),
    ...(validCoords(destination)
      ? [[Number(destination.latitude), Number(destination.longitude)]]
      : []),
  ]

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-gray-900">
            {isOngoing ? 'Navigate to destination' : 'Navigate to customer'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isOngoing
              ? 'Follow the route to the ride destination.'
              : 'Follow the route to the customer pickup point.'}
          </p>
        </div>

        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            Start Google Maps navigation
          </a>
        )}
      </div>

      {mapError && (
        <p className="mx-4 mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {mapError}
        </p>
      )}

      <MapContainer
        center={mapCenter}
        zoom={12}
        scrollWheelZoom
        style={{ height: '320px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RideMapUpdater points={mapPoints} />

        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#276EF1',
              weight: 6,
              opacity: 0.9,
            }}
          />
        )}

        {validCoords(driverPosition) && (
         <Marker
  position={[
    Number(driverPosition.latitude),
    Number(driverPosition.longitude),
  ]}
  icon={createVehicleIcon(ride.rideType, heading)}
>
  <Popup>
    {ride.rideType} driver — current location
  </Popup>
</Marker>
        )}

        {validCoords(pickup) && (
          <Marker
            position={[
              Number(pickup.latitude),
              Number(pickup.longitude),
            ]}
            icon={pickupIcon}
          >
            <Popup>Customer pickup</Popup>
          </Marker>
        )}

        {validCoords(destination) && (
          <Marker
            position={[
              Number(destination.latitude),
              Number(destination.longitude),
            ]}
            icon={destinationIcon}
          >
            <Popup>Ride destination</Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-xs text-gray-500">Route distance</p>
          <p className="mt-1 text-xl font-bold text-blue-700">
            {routeDistanceKm !== null
              ? `${routeDistanceKm.toFixed(1)} km`
              : 'Calculating...'}
          </p>
        </div>

        <div className="rounded-xl bg-green-50 p-3">
          <p className="text-xs text-gray-500">Estimated travel time</p>
          <p className="mt-1 text-xl font-bold text-green-700">
            {routeDurationMin !== null
              ? `${Math.ceil(routeDurationMin)} min`
              : 'Calculating...'}
          </p>
        </div>
      </div>

      {routeLoading && (
        <p className="px-4 pb-3 text-xs text-gray-500">
          Updating road route...
        </p>
      )}
    </div>
  )
}



  function DriverDashboard() {
    const [rides, setRides] = useState([])
    const [loading, setLoading] = useState(true)
    const [acceptingId, setAcceptingId] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [myRides, setMyRides] = useState([])


const [statsData, setStatsData] = useState({
  availableRequests: 0,
  completedRides: 0,
  totalEarnings: 0,
  onlinePaymentsCollected: 0,
  cashPaymentsExpected: 0,
  unpaidOnlineRides: 0,
  averageRating: 0,
  totalReviews: 0,
})


  const locationWatchRef = useRef(null)
  const trackingRideIdRef = useRef(null)


  const [rideHistory, setRideHistory] = useState([])

  const [historySummary, setHistorySummary] = useState({
    totalCompletedRides: 0,
    totalEarnings: 0,
    totalReviews: 0,
    averageRating: 0,
    dailyEarnings: 0,
    monthlyEarnings: 0,
  })

  const [historyFilter, setHistoryFilter] = useState('all')



  const savedUser = JSON.parse(
    localStorage.getItem('ridelyUser') || '{}'
  )

  const [profileName, setProfileName] = useState(savedUser.name || '')
  const [profilePhone, setProfilePhone] = useState(savedUser.phone || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')


    const fetchRides = useCallback(async () => {
      const token = localStorage.getItem('ridelyToken')

      if (!token) {
        setError('Please log in to view ride requests.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_URL}/available`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load ride requests.')
        }

        setRides(data.rides || [])
      } catch (err) {
        setError(err.message || 'Unable to connect to the server.')
      } finally {
        setLoading(false)
      }
    }, [])

    const fetchMyRides = useCallback(async () => {
    const token = localStorage.getItem('ridelyToken')

    try {
      const response = await fetch(`${API_URL}/my-driver-rides`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load your rides.')
      }

      console.log('My Driver Rides:', data.rides)
  setMyRides(data.rides || [])
    } catch (err) {
      setError(err.message || 'Unable to load your rides.')
    }
  }, [])


  const fetchDriverStats = useCallback(async () => {
    const token = localStorage.getItem('ridelyToken')

    try {
      const response = await fetch(`${API_URL}/driver-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load driver stats.')
      }

      setStatsData(data)
    } catch (err) {
      setError(err.message || 'Unable to load driver stats.')
    }
  }, [])


  const fetchRideHistory = useCallback(async () => {
    const token = localStorage.getItem('ridelyToken')

    if (!token) return

    try {
      const response = await fetch(`${API_URL}/driver-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load ride history.')
      }

      setRideHistory(data.rides || [])
      setHistorySummary({
        totalCompletedRides: data.summary?.totalCompletedRides ?? 0,
        totalEarnings: data.summary?.totalEarnings ?? 0,
        totalReviews: data.summary?.totalReviews ?? 0,
        averageRating: data.summary?.averageRating ?? 0,
        dailyEarnings: data.summary?.dailyEarnings ?? 0,
  monthlyEarnings: data.summary?.monthlyEarnings ?? 0,
      })
    } catch (err) {
      console.error('Ride history error:', err.message)
    }
  }, [])




  useEffect(() => {
    fetchRides()
    fetchMyRides()
    fetchDriverStats()
    fetchRideHistory()

    const intervalId = setInterval(() => {
      fetchRides()
      fetchMyRides()
      fetchDriverStats()
      fetchRideHistory()
    }, 5000)

    return () => clearInterval(intervalId)
  }, [fetchRides, fetchMyRides, fetchDriverStats,fetchRideHistory])


  useEffect(() => {
    return () => {
      if (locationWatchRef.current) {
        clearInterval(locationWatchRef.current)
      }
    }
  }, [])


  async function handleProfileUpdate(event) {
    event.preventDefault()

    setProfileLoading(true)
    setProfileMessage('')
    setProfileError('')

    try {
      const token = localStorage.getItem('ridelyToken')

      const response = await fetch(
        `${API_URL}/api/auth/profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: profileName.trim(),
            phone: profilePhone.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update profile')
      }

      const savedUser = JSON.parse(
        localStorage.getItem('ridelyUser') || '{}'
      )

      localStorage.setItem(
        'ridelyUser',
        JSON.stringify({
          ...savedUser,
          ...data.user,
        })
      )

      setProfileName(data.user.name || '')
      setProfilePhone(data.user.phone || '')
      setProfileMessage('Profile updated successfully!')
    } catch (err) {
      setProfileError(err.message || 'Something went wrong')
    } finally {
      setProfileLoading(false)
    }
  }


    async function handleAccept(rideId) {
      const token = localStorage.getItem('ridelyToken')

      setAcceptingId(rideId)
      setError('')
      setMessage('')

      try {
        const response = await fetch(`${API_URL}/${rideId}/accept`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to accept this ride.')
        }

        setRides((currentRides) =>
          currentRides.filter((ride) => ride._id !== rideId)
        )
        setMessage('Ride accepted successfully!')
  await fetchMyRides()
  await fetchDriverStats()
      } catch (err) {
        setError(err.message || 'Unable to accept this ride.')
        await fetchRides()
      } finally {
        setAcceptingId('')
      }
    }

  
    
    
  const startLocationTracking = useCallback((rideId) => {

    if (trackingRideIdRef.current === rideId && locationWatchRef.current) {
    return
  }

  trackingRideIdRef.current = rideId
  if (!navigator.geolocation) {
    trackingRideIdRef.current = null
    setError('Your browser does not support GPS location.')
    return
  }

    if (locationWatchRef.current) {
      clearInterval(locationWatchRef.current)
      locationWatchRef.current = null
    }

    const token = localStorage.getItem('ridelyToken')
    let sending = false

    const updateLocation = () => {
      if (sending) return

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('GPS POSITION:', {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  })
          sending = true

          try {
            const response = await fetch(
              `${API_URL}/${rideId}/location`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                }),
              }
            )

            const data = await response.json()

            if (!response.ok) {
              throw new Error(data.message || 'Unable to update GPS location.')
            }
          } catch (err) {
            setError(err.message || 'GPS location update failed.')
          } finally {
            sending = false
          }
        },
        (error) => {
    console.error('GPS ERROR:', {
      code: error.code,
      message: error.message,
      secureContext: window.isSecureContext,
      protocol: window.location.protocol,
    })

    setError(
      `GPS Error ${error.code}: ${error.message} | Secure context: ${window.isSecureContext}`
    )
  },
      {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 20000,
  }
      )
    }

    updateLocation()

    locationWatchRef.current = setInterval(updateLocation, 5000)
  }, [])


  const stopLocationTracking = useCallback(() => {
    if (locationWatchRef.current) {
      clearInterval(locationWatchRef.current)
      locationWatchRef.current = null
    }
  }, [])

  useEffect(() => {
    const ongoingRide = myRides.find(
      (ride) => ride.status === 'ongoing'
    )

    if (ongoingRide) {
      startLocationTracking(ongoingRide._id)
    } else {
      stopLocationTracking()
      trackingRideIdRef.current = null
    }
  }, [myRides, startLocationTracking, stopLocationTracking])


  async function handleStatusUpdate(rideId, status) {
    const token = localStorage.getItem('ridelyToken')

    setAcceptingId(rideId)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/${rideId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update ride status.')
      }

      setMessage(data.message)
      
  if (status === 'ongoing') {
    startLocationTracking(rideId)
  }

  if (status === 'completed') {
    stopLocationTracking()
  }

      await fetchMyRides()
      await fetchRides()
      await fetchDriverStats()
    } catch (err) {
      setError(err.message || 'Unable to update ride status.')
    } finally {
      setAcceptingId('')
    }
  }

  
async function handleCashPaymentPaid(rideId) {
  const token = localStorage.getItem('ridelyToken')

  setAcceptingId(rideId)
  setError('')
  setMessage('')

  try {
    const response = await fetch(
      `${API_URL}/api/payments/cash/${rideId}/paid`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Unable to update cash payment.'
      )
    }

    setMessage('Cash payment marked as paid successfully!')

    await fetchMyRides()
    await fetchDriverStats()
    await fetchRideHistory()
  } catch (err) {
    setError(err.message || 'Unable to update cash payment.')
  } finally {
    setAcceptingId('')
  }
}



  const stats = [
    {
      title: 'Available requests',
      value: loading ? '...' : String(statsData.availableRequests),
      Icon: CarFront,
    },
    {
      title: 'Completed rides',
      value: String(statsData.completedRides),
      Icon: Clock3,
    },
    {
      title: 'Total earnings',
      value: `₹${statsData.totalEarnings}`,
      Icon: IndianRupee,
    },
    
    {
      title: 'Average rating',
      value: statsData.averageRating > 0
        ? `${statsData.averageRating}/5`
        : 'No ratings yet',
      Icon: Star,
    },
    {
      title: 'Total reviews',
      value: String(statsData.totalReviews),
      Icon: MessageSquare,
    },

  ]


  const filteredRideHistory = rideHistory.filter((ride) => {
    if (historyFilter === 'all') return true

    const rideDate = new Date(ride.createdAt)
    const now = new Date()

    if (Number.isNaN(rideDate.getTime())) return false

    if (historyFilter === 'today') {
      return rideDate.toDateString() === now.toDateString()
    }

    if (historyFilter === '7days') {
      const startDate = new Date(now)
      startDate.setDate(now.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)

      return rideDate >= startDate && rideDate <= now
    }

    if (historyFilter === 'month') {
      return (
        rideDate.getFullYear() === now.getFullYear() &&
        rideDate.getMonth() === now.getMonth()
      )
    }

    return true
  })


    return (
      <main className="min-h-screen bg-gray-50 px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="text-sm font-semibold text-lime-700">
              ← Back to home
            </Link>

            
  <button
    type="button"
    onClick={() => {
      fetchRides()
      fetchMyRides()
      fetchDriverStats()
    }}
    disabled={loading}
    className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
  >
    <RefreshCw size={16} />
    Refresh
  </button>

          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-gray-950">
            Driver dashboard
          </h1>

          <p className="mt-2 text-gray-500">
            View available rides and manage your requests.
          </p>

          
  {/* Driver Profile */}
  <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-6">
    <h2 className="text-xl font-bold text-gray-950">
      Driver Profile
    </h2>

    <p className="mt-1 text-sm text-gray-500">
      Update your name and contact number.
    </p>

    <form onSubmit={handleProfileUpdate} className="mt-5 space-y-4">
      <div>
        <label
          htmlFor="profileName"
          className="mb-2 block text-sm font-semibold text-gray-700"
        >
          Full Name
        </label>

        <input
          id="profileName"
          type="text"
          required
          value={profileName}
          onChange={(event) => setProfileName(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-lime-500"
          placeholder="Enter your name"
        />
      </div>

      <div>
        <label
          htmlFor="profilePhone"
          className="mb-2 block text-sm font-semibold text-gray-700"
        >
          Phone Number
        </label>

        <input
          id="profilePhone"
          type="tel"
          value={profilePhone}
          onChange={(event) => setProfilePhone(event.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-lime-500"
          placeholder="Enter your phone number"
        />
      </div>

      {profileMessage && (
        <p role="status" className="text-sm text-green-700">
          {profileMessage}
        </p>
      )}

      {profileError && (
        <p role="alert" className="text-sm text-red-600">
          {profileError}
        </p>
      )}

      <button
        type="submit"
        disabled={profileLoading}
        className="rounded-xl bg-lime-300 px-5 py-3 font-bold text-gray-950 transition hover:bg-lime-400 disabled:opacity-60"
      >
        {profileLoading ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  </section>


          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map(({ title, value, Icon }) => (
              <article key={title} className="rounded-2xl border bg-white p-6">
                <Icon size={27} className="text-lime-700" />
                <p className="mt-5 text-sm text-gray-500">{title}</p>
                <p className="mt-2 text-3xl font-extrabold text-gray-950">
                  {value}
                </p>
              </article>
            ))}
          </div>

          
{/* Payment Breakdown */}
<section className="mt-7">
  <h2 className="mb-4 text-xl font-bold text-gray-950">
    Payment Breakdown
  </h2>

  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    <article className="rounded-2xl border border-green-200 bg-white p-6">
      <IndianRupee size={27} className="text-green-700" />
      <p className="mt-5 text-sm text-gray-500">
        Online Payments Collected
      </p>
      <p className="mt-2 text-3xl font-extrabold text-green-700">
        ₹{Number(statsData.onlinePaymentsCollected || 0).toLocaleString('en-IN')}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Successfully paid online fares
      </p>
    </article>

    <article className="rounded-2xl border border-amber-200 bg-white p-6">
      <IndianRupee size={27} className="text-amber-600" />
      <p className="mt-5 text-sm text-gray-500">
        Cash Payments Expected
      </p>
      <p className="mt-2 text-3xl font-extrabold text-amber-700">
        ₹{Number(statsData.cashPaymentsExpected || 0).toLocaleString('en-IN')}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Total fare from completed cash rides
      </p>
    </article>

    <article className="rounded-2xl border border-red-200 bg-white p-6">
      <Clock3 size={27} className="text-red-600" />
      <p className="mt-5 text-sm text-gray-500">
        Unpaid Online Rides
      </p>
      <p className="mt-2 text-3xl font-extrabold text-red-700">
        {statsData.unpaidOnlineRides || 0}
      </p>
      <p className="mt-2 text-xs text-gray-500">
        Completed rides awaiting online payment
      </p>
    </article>
  </div>
</section>


          {message && (
            <p role="status" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              {message}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          <section className="mt-7 rounded-2xl border bg-white p-6">
            <h2 className="font-bold text-gray-950">Available ride requests</h2>

            {loading ? (
              <p className="mt-4 text-sm text-gray-500">Loading ride requests...</p>
            ) : rides.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No available rides right now. Click Refresh to check again.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {rides.map((ride) => (
                  <article
                    key={ride._id}
                    className="rounded-xl border border-gray-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-3">
                        <p className="flex items-start gap-2 text-sm text-gray-700">
                          <MapPin size={18} className="mt-0.5 shrink-0 text-lime-700" />
                          <span>
                            <span className="block text-xs text-gray-500">Pickup</span>
                            <span className="font-semibold">{ride.pickup}</span>
                          </span>
                        </p>

                        <p className="flex items-start gap-2 text-sm text-gray-700">
                          <MapPin size={18} className="mt-0.5 shrink-0 text-gray-400" />
                          <span>
                            <span className="block text-xs text-gray-500">Destination</span>
                            <span className="font-semibold">{ride.destination}</span>
                          </span>
                        </p>

                        <p className="text-sm text-gray-500">
                          Ride type: <span className="font-semibold text-gray-800">{ride.rideType}</span>
                        </p>
                        
  <p className="text-lg font-extrabold text-green-700">
    ₹{Number(ride.fare ?? 0).toLocaleString('en-IN')}
  </p>

  <p className="text-xs text-gray-500">
    Estimated ride fare
  </p>

                      </div>

                      <button
                        type="button"
                        onClick={() => handleAccept(ride._id)}
                        disabled={acceptingId !== ''}
                        className="shrink-0 rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {acceptingId === ride._id ? 'Accepting...' : 'Accept ride'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          
  <section className="mt-7 rounded-2xl border bg-white p-6">
    <h2 className="font-bold text-gray-950">My assigned rides</h2>

    {myRides.length === 0 ? (
      <p className="mt-4 text-sm text-gray-500">
        You have no accepted rides yet.
      </p>
    ) : (
      <div className="mt-5 space-y-4">
        {myRides.map((ride) => (
          <article key={ride._id} className="rounded-xl border p-4">
            <p className="font-semibold text-gray-900">
              {ride.pickup} → {ride.destination}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {ride.rideType} · ₹{ride.fare} · Status: {ride.status}
            </p>


          
{/* Pickup and Destination Map */}
<DriverRideMap ride={ride} />

            
  {/* Customer Details */}
  <div className="mt-4 rounded-xl bg-gray-50 p-4">
    <p className="text-sm font-semibold text-gray-900">
      Customer: {ride.user?.name || 'Customer'}
    </p>

    {ride.user?.phone && (
      <p className="mt-1 text-sm text-gray-600">
        Phone: {ride.user.phone}
      </p>
    )}

    {/* Customer Rating */}
    <div className="mt-3 border-t border-gray-200 pt-3">
      <p className="text-sm font-semibold text-gray-800">
        Customer Feedback
      </p>

      {ride.rating ? (
        <>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg tracking-wide text-amber-500">
              {'★'.repeat(ride.rating)}
              {'☆'.repeat(5 - ride.rating)}
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {ride.rating}/5
            </span>
          </div>

          {ride.review && (
            <p className="mt-2 text-sm text-gray-600">
              “{ride.review}”
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-500">
          {ride.status === 'completed'
            ? 'Customer has not rated this ride yet.'
            : 'Feedback will appear after the customer rates the ride.'}
        </p>
      )}
    </div>
  </div>


            {ride.status === 'accepted' && (
              <button
                type="button"
                disabled={acceptingId !== ''}
                onClick={() => handleStatusUpdate(ride._id, 'ongoing')}
                className="mt-4 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {acceptingId === ride._id ? 'Updating...' : 'Start Ride'}
              </button>
            )}

            {ride.status === 'ongoing' && (
              <button
                type="button"
                disabled={acceptingId !== ''}
                onClick={() => handleStatusUpdate(ride._id, 'completed')}
                className="mt-4 rounded-xl bg-lime-300 px-4 py-2 text-sm font-bold text-gray-950 disabled:opacity-50"
              >
                {acceptingId === ride._id ? 'Updating...' : 'Complete Ride'}
              </button>
            )}

            
{ride.status === 'completed' &&
  ride.paymentMethod === 'Cash' &&
  ride.paymentStatus !== 'Paid' && (
    <button
      type="button"
      disabled={acceptingId !== ''}
      onClick={() => {
        const confirmed = window.confirm(
          'Have you received the full cash payment from the customer?'
        )

        if (confirmed) {
          handleCashPaymentPaid(ride._id)
        }
      }}
      className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {acceptingId === ride._id
        ? 'Updating payment...'
        : 'Mark Cash as Paid'}
    </button>
  )}

{ride.status === 'completed' &&
  ride.paymentMethod === 'Cash' &&
  ride.paymentStatus === 'Paid' && (
    <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-700">
      ✓ Cash Payment Paid
      {ride.paymentPaidAt && (
        <span className="mt-1 block text-xs font-normal">
          {new Date(ride.paymentPaidAt).toLocaleString('en-IN')}
        </span>
      )}
    </p>
  )}

          </article>
        ))}
      </div>
    )}
  </section>


  {/* Ride History */}
  <section className="mt-7 rounded-2xl border border-gray-200 bg-white p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-gray-950">
          Ride History
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Your completed rides and customer feedback
        </p>
      </div>

      
  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div className="rounded-xl border border-green-100 bg-green-50 p-4">
      <p className="text-sm font-medium text-gray-600">
        Today's Earnings
      </p>
      <p className="mt-2 text-2xl font-extrabold text-green-700">
        ₹{Number(historySummary.dailyEarnings).toLocaleString('en-IN')}
      </p>
    </div>

    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm font-medium text-gray-600">
        This Month's Earnings
      </p>
      <p className="mt-2 text-2xl font-extrabold text-blue-700">
        ₹{Number(historySummary.monthlyEarnings).toLocaleString('en-IN')}
      </p>
    </div>
  </div>


      <div className="rounded-xl bg-lime-50 px-4 py-3">
        <p className="text-xs font-medium text-gray-600">
          Total Earnings
        </p>
        <p className="mt-1 text-2xl font-extrabold text-green-700">
          ₹{Number(historySummary.totalEarnings).toLocaleString('en-IN')}
        </p>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-xs text-gray-500">Completed Rides</p>
        <p className="mt-2 text-2xl font-bold text-gray-950">
          {historySummary.totalCompletedRides}
        </p>
      </div>

      
  <div className="mt-6">
    <label
      htmlFor="historyFilter"
      className="mb-2 block text-sm font-semibold text-gray-700"
    >
      Filter ride history
    </label>

    <select
      id="historyFilter"
      value={historyFilter}
      onChange={(event) => setHistoryFilter(event.target.value)}
      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-lime-500 sm:max-w-xs"
    >
      <option value="today">Today</option>
      <option value="7days">Last 7 Days</option>
      <option value="month">This Month</option>
      <option value="all">All Time</option>
    </select>
  </div>

      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-xs text-gray-500">Average Rating</p>
        <p className="mt-2 text-2xl font-bold text-gray-950">
          {historySummary.averageRating > 0
            ? `★ ${historySummary.averageRating}/5`
            : 'No ratings'}
        </p>
      </div>

      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-xs text-gray-500">Total Reviews</p>
        <p className="mt-2 text-2xl font-bold text-gray-950">
          {historySummary.totalReviews}
        </p>
      </div>
    </div>

    <div className="mt-6 space-y-4">
      {filteredRideHistory.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No completed rides yet. Your ride history will appear here.
        </p>
      ) : (
        filteredRideHistory.map((ride) => (
          <article
            key={ride._id}
            className="rounded-xl border border-gray-200 p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-bold text-gray-950">
                  {ride.pickup} → {ride.destination}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {ride.rideType}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {ride.createdAt
                    ? new Date(ride.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Date unavailable'}
                </p>
              </div>

              <div className="sm:text-right">
                <p className="text-xl font-extrabold text-green-700">
                  ₹{Number(ride.fare ?? 0).toLocaleString('en-IN')}
                </p>
                <span className="mt-1 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Completed
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-800">
                Customer: {ride.user?.name || 'Customer'}
              </p>

              {ride.rating ? (
                <>
                  <p className="mt-2 text-lg tracking-wide text-amber-500">
                    {'★'.repeat(ride.rating)}
                    {'☆'.repeat(5 - ride.rating)}
                    <span className="ml-2 text-sm font-semibold text-gray-700">
                      {ride.rating}/5
                    </span>
                  </p>

                  {ride.review && (
                    <p className="mt-2 text-sm text-gray-600">
                      “{ride.review}”
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  No customer rating for this ride.
                </p>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  </section>


        </div>
      </main>
    )
  }

  export default DriverDashboard
