
import { useEffect, useRef, useState } from 'react'
import { MapPin, LocateFixed, LoaderCircle } from 'lucide-react'


function LocationFields({
  pickup,
  setPickup,
  destination,
  setDestination,
  setMessage,
  onPickupCoordsChange,
  onDestinationCoordsChange,
}) {

  const [activeField, setActiveField] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)

  const searchTimer = useRef(null)
  const requestId = useRef(0)

  const [pickupCoords, setPickupCoords] = useState(null)
  const [destinationCoords, setDestinationCoords] = useState(null)

  const currentValue =
    activeField === 'pickup' ? pickup : destination

  useEffect(() => {
    clearTimeout(searchTimer.current)

    if (!activeField || currentValue.trim().length < 3) {
      setSuggestions([])
      setSearching(false)
      return
    }

    const currentRequest = ++requestId.current
    setSearching(true)

    searchTimer.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: currentValue.trim(),
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
        })

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`
        )

        if (!response.ok) {
          throw new Error('Address search failed.')
        }

        const results = await response.json()

        if (currentRequest === requestId.current) {
          setSuggestions(
            results.map((item) => ({
              id: item.place_id,
              label: item.display_name,
              latitude: Number(item.lat),
              longitude: Number(item.lon),
            }))
          )
        }
      } catch (error) {
        if (currentRequest === requestId.current) {
          setSuggestions([])
          setMessage('Unable to load address suggestions. Please try again.')
        }
      } finally {
        if (currentRequest === requestId.current) {
          setSearching(false)
        }
      }
    }, 700)

    return () => clearTimeout(searchTimer.current)
  }, [activeField, currentValue, setMessage])

  useEffect(() => {
    return () => clearTimeout(searchTimer.current)
  }, [])


function selectSuggestion(item) {
  const coords = {
    latitude: item.latitude,
    longitude: item.longitude,
  }

  if (activeField === 'pickup') {
    setPickup(item.label)
    setPickupCoords(coords)
    onPickupCoordsChange?.(coords)
  } else {
    setDestination(item.label)
    setDestinationCoords(coords)
    onDestinationCoordsChange?.(coords)
  }

  setSuggestions([])
  setActiveField('')
  setMessage('')
}


  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage('Your browser does not support location access.')
      return
    }

    setLocating(true)
    setMessage('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const params = new URLSearchParams({
            lat: String(latitude),
            lon: String(longitude),
            format: 'jsonv2',
          })

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${params}`
          )

          if (!response.ok) {
            throw new Error('Unable to find your current address.')
          }

          const result = await response.json()
          const address =
            result.display_name || `${latitude}, ${longitude}`

          setPickup(address)

const coords = { latitude, longitude }
setPickupCoords(coords)
onPickupCoordsChange?.(coords)
          setActiveField('')
          setSuggestions([])
          setMessage('')
        } catch (error) {
          setMessage(error.message || 'Unable to find your current address.')
        } finally {
          setLocating(false)
        }
      },
      (error) => {
        setMessage(
          error.code === 1
            ? 'Please allow location permission in your browser.'
            : error.code === 3
              ? 'Location request timed out. Please try again.'
              : 'Unable to determine your current location.'
        )
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    )
  }

  function handleInputChange(field, value) {
    if (field === 'pickup') {
  setPickup(value)
  setPickupCoords(null)
  onPickupCoordsChange?.(null)
} else {
  setDestination(value)
  setDestinationCoords(null)
  onDestinationCoordsChange?.(null)
}

    setActiveField(field)
    setMessage('')
  }

  function renderSuggestions() {
    if (!activeField) return null

    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        {searching && (
          <p className="px-4 py-3 text-sm text-gray-500">
            Searching addresses...
          </p>
        )}

        {!searching &&
          suggestions.map((item) => (
            <button
              type="button"
              key={item.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(item)}
              className="block w-full border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-700 hover:bg-lime-50"
            >
              <span className="flex gap-2">
                <MapPin size={17} className="mt-0.5 shrink-0 text-lime-700" />
                <span>{item.label}</span>
              </span>
            </button>
          ))}

        {!searching &&
          currentValue.trim().length >= 3 &&
          suggestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">
              No addresses found. Try another search.
            </p>
          )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleCurrentLocation}
        disabled={locating}
        className="flex items-center gap-2 text-sm font-semibold text-lime-700 hover:text-lime-800 disabled:opacity-60"
      >
        {locating ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <LocateFixed size={17} />
        )}
        {locating ? 'Finding your location...' : 'Use my current location'}
      </button>

      <div className="relative">
        <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-200 px-4 focus-within:border-lime-500 focus-within:ring-4 focus-within:ring-lime-100">
          <span className="h-3 w-3 shrink-0 rounded-full border-[3px] border-lime-600" />

          <input
            type="text"
            value={pickup}
            onFocus={() => setActiveField('pickup')}
            onChange={(event) =>
              handleInputChange('pickup', event.target.value)
            }
            onBlur={() =>
              setTimeout(() => {
                setActiveField((field) =>
                  field === 'pickup' ? '' : field
                )
              }, 150)
            }
            placeholder="Enter pickup location"
            aria-label="Pickup location"
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>

        {activeField === 'pickup' && renderSuggestions()}
      </div>

      <div className="relative">
        <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-200 px-4 focus-within:border-lime-500 focus-within:ring-4 focus-within:ring-lime-100">
          <MapPin size={19} className="shrink-0 text-lime-700" />

          <input
            type="text"
            value={destination}
            onFocus={() => setActiveField('destination')}
            onChange={(event) =>
              handleInputChange('destination', event.target.value)
            }
            onBlur={() =>
              setTimeout(() => {
                setActiveField((field) =>
                  field === 'destination' ? '' : field
                )
              }, 150)
            }
            placeholder="Enter your destination"
            aria-label="Destination"
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>

        {activeField === 'destination' && renderSuggestions()}
      </div>
    </div>
  )
}

export default LocationFields
