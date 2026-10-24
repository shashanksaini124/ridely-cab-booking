
import {
  Zap,
  ShieldCheck,
  Clock3,
} from 'lucide-react'

import BookingCard from './BookingCard'

function HeroSection() {
  return (
    <section className="grid grid-cols-1 items-center gap-10 bg-gradient-to-br from-lime-50 via-white to-white px-5 py-12 md:grid-cols-2 md:gap-14 md:px-8 md:py-20 lg:px-16 lg:py-24">
      <div className="mx-auto w-full max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-100 px-4 py-2 text-xs font-extrabold tracking-widest text-lime-800">
          <Zap size={15} />
          YOUR CITY. YOUR RIDE.
        </span>

        <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
          Go anywhere.
          <br />
          <span className="text-lime-600">Go your way.</span>
        </h1>

        <p className="mt-6 max-w-lg text-base leading-8 text-gray-600 md:text-lg">
          Your everyday rides, made simple. Book a ride
          in minutes and get where you need to be.
        </p>

        <div className="mt-7 flex flex-wrap gap-5">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <ShieldCheck size={19} className="text-lime-700" />
            Safe rides
          </span>

          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock3 size={19} className="text-lime-700" />
            Quick pickups
          </span>
        </div>

        <div className="mt-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-lime-200 text-xs font-bold">
              S
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-orange-100 text-xs font-bold">
              R
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-blue-100 text-xs font-bold">
              A
            </span>
          </div>

          <p className="text-sm leading-6 text-gray-500">
            <strong className="text-gray-900">
              Your city, connected.
            </strong>
            <br />
            A better way to get around.
          </p>
        </div>
      </div>

      <BookingCard />
    </section>
  )
}

export default HeroSection
