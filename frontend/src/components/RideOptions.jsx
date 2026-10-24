
import { CarFront } from 'lucide-react'


const rides = [
  {
    name: 'Bike',
    ratePerKm: 3,
    time: '3 min',
    description: 'Affordable bike rides',
  },
  {
    name: 'Three-Wheeler',
    ratePerKm: 4,
    time: '4 min',
    description: 'Comfortable auto rides',
  },
  {
    name: 'Car',
    ratePerKm: 5,
    time: '7 min',
    description: 'Comfortable car rides',
  },
]


function RideOptions({
  rideType,
  setRideType,
  setMessage,
  distanceKm = null,
}) {
  const hasDistance =
    typeof distanceKm === 'number' &&
    Number.isFinite(distanceKm) &&
    distanceKm >= 0

function calculateFare(ratePerKm) {
  if (!hasDistance) return null
  return Math.ceil(distanceKm * ratePerKm)
}

  return (
    <div className="mt-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gray-900">
          Choose your ride
        </h3>

        <span className="text-[11px] text-gray-500">
          {hasDistance
            ? `${distanceKm.toFixed(1)} km estimated`
            : 'Fare after route selection'}
        </span>
      </div>

      <div className="space-y-3">
        {rides.map((ride) => {
          const selected = rideType === ride.name
          const fare = calculateFare(ride.ratePerKm)

          return (
            <button
              type="button"
              key={ride.name}
              aria-pressed={selected}
              onClick={() => {
                setRideType(ride.name)
                setMessage('')
              }}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition sm:p-4 ${
                selected
                  ? 'border-lime-500 bg-lime-50 ring-1 ring-lime-500'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-800">
                <CarFront size={29} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900">
                  {ride.name}
                </span>

                <span className="mt-1 block text-xs text-gray-500">
                  {ride.description}
                </span>

                <span className="mt-1 block text-xs text-gray-500">
                  Pickup in {ride.time}
                </span>
              </span>

              <span className="shrink-0 text-sm font-extrabold text-gray-950">
                {fare === null ? '—' : `₹${fare}`}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[10px] leading-5 text-gray-500">
        Bike: ₹3/km · Three-Wheeler: ₹4/km · Car: ₹5/km. Final fare requires a valid route distance.
      </p>
    </div>
  )
}

export default RideOptions
