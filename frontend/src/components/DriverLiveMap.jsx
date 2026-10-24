
import { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Different vehicle icons
function createVehicleIcon(rideType, heading = 0) {
  const vehicles = {
    Bike: { emoji: '🏍️', label: 'Bike' },
    'Three-Wheeler': { emoji: '🛺', label: 'Auto' },
    Car: { emoji: '🚗', label: 'Car' },
  }

  const selected = vehicles[rideType] || vehicles.Car

  return L.divIcon({
    className: 'ridely-vehicle-marker',
    html: `
      <div title="${selected.label}" style="
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
        transition: transform 0.3s ease;
      ">${selected.emoji}</div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24],
  })
}

// Pickup marker
const pickupIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  iconRetinaUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Destination marker
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
  shadowSize: [41, 41],
})

function isValidCoords(coords) {
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

// Map initializes once, then follows the driver without repeated zooming
function MapUpdater({
  latitude,
  longitude,
  pickupCoordinates,
  destinationCoordinates,
}) {
  const map = useMap()
  const initialized = useRef(false)

  useEffect(() => {
    const points = []

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      points.push([latitude, longitude])
    }

    if (isValidCoords(pickupCoordinates)) {
      points.push([
        Number(pickupCoordinates.latitude),
        Number(pickupCoordinates.longitude),
      ])
    }

    if (isValidCoords(destinationCoordinates)) {
      points.push([
        Number(destinationCoordinates.latitude),
        Number(destinationCoordinates.longitude),
      ])
    }

    if (points.length === 0) return

    if (!initialized.current) {
      if (points.length > 1) {
        map.fitBounds(points, {
          padding: [30, 30],
          maxZoom: 14,
          animate: false,
        })
      } else {
        map.setView(points[0], 15, { animate: false })
      }

      initialized.current = true
      return
    }

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      map.panTo([latitude, longitude], {
        animate: true,
        duration: 0.8,
      })
    }
  }, [
    map,
    latitude,
    longitude,
    pickupCoordinates?.latitude,
    pickupCoordinates?.longitude,
    destinationCoordinates?.latitude,
    destinationCoordinates?.longitude,
  ])

  return null
}


function SmoothVehicleMarker({ latitude, longitude, icon, children }) {
  const markerRef = useRef(null)
  const map = useMap()

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const target = L.latLng(latitude, longitude)
    const current = marker.getLatLng()

    const startLat = current.lat
    const startLng = current.lng
    const endLat = target.lat
    const endLng = target.lng

    const distance = map.distance(current, target)

    // Avoid unnecessary animation for tiny GPS changes.
    if (distance < 1) return

    let animationFrame
    const duration = Math.min(2000, Math.max(500, distance * 20))
    const startTime = performance.now()

    function animate(now) {
      const progress = Math.min((now - startTime) / duration, 1)

      // Smooth ease-in/ease-out.
      const eased =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

      marker.setLatLng([
        startLat + (endLat - startLat) * eased,
        startLng + (endLng - startLng) * eased,
      ])

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [latitude, longitude, map])

  return (
    <Marker
      ref={markerRef}
      position={[latitude, longitude]}
      icon={icon}
    >
      {children}
    </Marker>
  )
}

export default function DriverLiveMap({
  latitude,
  longitude,
  pickupCoordinates,
  destinationCoordinates,
  rideStatus,
  rideType,
}) {
  const [routeCoordinates, setRouteCoordinates] = useState([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [routeDistanceKm, setRouteDistanceKm] = useState(null)
  const [routeDurationMin, setRouteDurationMin] = useState(null)
  const [heading, setHeading] = useState(0)

  // Refs and hooks must be declared before any conditional return
  const previousPosition = useRef(null)

  const lat = Number(latitude)
  const lng = Number(longitude)

  const validDriverLocation =
    latitude != null &&
    longitude != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180

  // Calculate direction from consecutive GPS coordinates
  useEffect(() => {
    if (!validDriverLocation) return

    const current = { latitude: lat, longitude: lng }
    const previous = previousPosition.current

    if (
      previous &&
      (previous.latitude !== lat || previous.longitude !== lng)
    ) {
      const lat1 = previous.latitude * Math.PI / 180
      const lat2 = lat * Math.PI / 180
      const deltaLng = (lng - previous.longitude) * Math.PI / 180

      const y = Math.sin(deltaLng) * Math.cos(lat2)
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) *
          Math.cos(lat2) *
          Math.cos(deltaLng)

      const bearing =
        (Math.atan2(y, x) * 180 / Math.PI + 360) % 360

      // Ignore tiny GPS movements that may cause noisy rotation
      const distanceMoved = Math.hypot(
        lat - previous.latitude,
        lng - previous.longitude
      )

      if (distanceMoved > 0.00001) {
        setHeading(bearing)
      }
    }

    previousPosition.current = current
  }, [validDriverLocation, lat, lng])


  // Calculate remaining route from the driver's current location
  useEffect(() => {
    const ongoing = rideStatus === 'ongoing'

    // Accepted: driver -> pickup
    // Ongoing: driver -> destination
    const start = {
      latitude: lat,
      longitude: lng,
    }

    const end = ongoing
      ? destinationCoordinates
      : pickupCoordinates

    if (
      !validDriverLocation ||
      !isValidCoords(end) ||
      !['accepted', 'ongoing'].includes(rideStatus)
    ) {
      setRouteCoordinates([])
      setRouteDistanceKm(null)
      setRouteDurationMin(null)
      setRouteLoading(false)

      if (!validDriverLocation) {
        setRouteError('Waiting for driver GPS location.')
      } else if (!isValidCoords(end)) {
        setRouteError('Route coordinates are not available.')
      } else {
        setRouteError('')
      }

      return
    }

    const controller = new AbortController()

    async function fetchRoute() {
      setRouteLoading(true)
      setRouteError('')

      try {
        const url =
          'https://router.project-osrm.org/route/v1/driving/' +
          `${start.longitude},${start.latitude};` +
          `${Number(end.longitude)},${Number(end.latitude)}` +
          '?overview=full&geometries=geojson'

        const response = await fetch(url, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to fetch route.')
        }

        const data = await response.json()

        if (data.code !== 'Ok' || !data.routes?.length) {
          throw new Error('No driving route found.')
        }

        const route = data.routes[0]

        const coordinates = route.geometry.coordinates.map(
          ([routeLng, routeLat]) => [routeLat, routeLng]
        )

        setRouteCoordinates(coordinates)
        setRouteDistanceKm(route.distance / 1000)
        setRouteDurationMin(route.duration / 60)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Route error:', error.message)
          setRouteError('Unable to refresh the remaining route.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false)
        }
      }
    }

    fetchRoute()

    return () => controller.abort()
  }, [
    lat,
    lng,
    validDriverLocation,
    pickupCoordinates?.latitude,
    pickupCoordinates?.longitude,
    destinationCoordinates?.latitude,
    destinationCoordinates?.longitude,
    rideStatus,
  ])


  // Conditional rendering is safe because all hooks are above it
  if (!validDriverLocation) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl bg-gray-100 text-gray-600">
        <span className="font-semibold">
          Waiting for driver location...
        </span>
        <span className="text-sm">
          Map will appear when the driver's GPS location is available.
        </span>
      </div>
    )
  }

  const position = [lat, lng]

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <h3 className="font-semibold text-gray-900">
            Live driver tracking
          </h3>
          <p className="text-xs text-gray-500">
            Driver location updates as new GPS data arrives
          </p>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Live
        </span>
      </div>

      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom
        style={{
          height: '320px',
          width: '100%',
          background: '#eef2f7',
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater
          latitude={lat}
          longitude={lng}
          pickupCoordinates={pickupCoordinates}
          destinationCoordinates={destinationCoordinates}
        />

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

       
<SmoothVehicleMarker
  latitude={lat}
  longitude={lng}
  icon={createVehicleIcon(rideType, heading)}
>
  <Popup>
    {rideType || 'Vehicle'} — driver's current location
  </Popup>
</SmoothVehicleMarker>


        {isValidCoords(pickupCoordinates) && (
          <Marker
            position={[
              Number(pickupCoordinates.latitude),
              Number(pickupCoordinates.longitude),
            ]}
            icon={pickupIcon}
          >
            <Popup>Customer pickup location</Popup>
          </Marker>
        )}

        {isValidCoords(destinationCoordinates) && (
          <Marker
            position={[
              Number(destinationCoordinates.latitude),
              Number(destinationCoordinates.longitude),
            ]}
            icon={destinationIcon}
          >
            <Popup>Ride destination</Popup>
          </Marker>
        )}
      </MapContainer>

     
{routeDistanceKm !== null && routeDurationMin !== null && (
  <div className="grid grid-cols-2 gap-3 border-b border-gray-100 p-4">
    <div className="rounded-xl bg-blue-50 p-3">
      <p className="text-xs text-gray-500">
        {rideStatus === 'ongoing'
          ? 'Distance to destination'
          : 'Distance to pickup'}
      </p>

      <p className="mt-1 text-xl font-bold text-blue-700">
        {routeDistanceKm.toFixed(1)} km
      </p>
    </div>

    <div className="rounded-xl bg-green-50 p-3">
      <p className="text-xs text-gray-500">
        {rideStatus === 'ongoing'
          ? 'Time to destination'
          : 'Time to pickup'}
      </p>

      <p className="mt-1 text-xl font-bold text-green-700">
        {Math.ceil(routeDurationMin)} min
      </p>
    </div>
  </div>
)}


      <div className="space-y-1 px-4 py-3 text-sm">
        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-600" />
          Customer pickup
        </p>

        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-600" />
          Destination
        </p>

        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-600" />
          Driver's current location
        </p>

        {routeLoading && (
          <p className="pt-2 text-xs text-gray-500">
            Loading road route...
          </p>
        )}

        {routeError && (
          <p className="pt-2 text-xs text-amber-700">
            {routeError}
          </p>
        )}
      </div>
    </div>
  )
}
