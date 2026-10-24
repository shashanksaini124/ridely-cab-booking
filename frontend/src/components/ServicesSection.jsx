
import {
  CarFront,
  Clock3,
  ShieldCheck,
  ArrowUpRight,
  MapPin,
  CheckCircle2,
} from 'lucide-react'

const services = [
  {
    title: 'Everyday rides',
    description:
      'Comfortable rides for your daily commute, errands and city travel.',
    Icon: CarFront,
    number: '01',
  },
  {
    title: 'Quick pickups',
    description:
      'Choose your ride and view estimated pickup times before booking.',
    Icon: Clock3,
    number: '02',
  },
  {
    title: 'Ride with confidence',
    description:
      'Review your booking details and follow your ride status from your dashboard.',
    Icon: ShieldCheck,
    number: '03',
  },
]

function scrollToBooking() {
  document.getElementById('book')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function ServicesSection() {
  return (
    <>
      {/* SERVICES SECTION */}
      <section
        id="services"
        className="scroll-mt-24 bg-[#f8faf5] px-5 py-20 sm:px-8 lg:px-16 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <span className="text-xs font-extrabold tracking-[2px] text-lime-700">
                MADE FOR EVERY JOURNEY
              </span>

              <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
                Getting there,
                <br className="hidden sm:block" />
                made easier.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-gray-600 sm:text-base">
              Simple booking, convenient ride options and a smoother
              way to move around your city.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {services.map(({ title, description, Icon, number }) => (
              <article
                key={number}
                className="group rounded-2xl border border-gray-200/80 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-lime-300 hover:shadow-xl hover:shadow-gray-200/50 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime-100 text-lime-800 transition group-hover:bg-lime-300">
                    <Icon size={27} />
                  </span>

                  <span className="text-sm font-bold text-gray-300">
                    {number}
                  </span>
                </div>

                <h3 className="mt-8 text-xl font-bold text-gray-950">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {description}
                </p>

                <button
                  type="button"
                  onClick={scrollToBooking}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-gray-900 transition hover:text-lime-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 focus-visible:ring-offset-4"
                >
                  Explore rides
                  <ArrowUpRight size={17} />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SAFETY SECTION */}
      <section
        id="safety"
        className="scroll-mt-24 bg-white px-5 py-16 sm:px-8 lg:px-16 lg:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-10 rounded-3xl border border-lime-100 bg-lime-50 p-7 sm:p-10 md:grid-cols-2 md:items-center lg:p-14">
          <div>
            <span className="text-xs font-extrabold tracking-[2px] text-lime-700">
              YOUR SAFETY MATTERS
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              Every ride starts with confidence.
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              Check your pickup and destination before booking.
              Keep track of your ride status and review the
              available ride details through Ridely.
            </p>

            <button
              type="button"
              onClick={scrollToBooking}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-lime-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-600 focus-visible:ring-offset-2"
            >
              Book a ride
              <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lime-100 text-lime-700">
                <MapPin size={24} />
              </span>

              <div>
                <h3 className="font-bold text-gray-950">
                  Verify ride details
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Review the pickup location, destination and
                  selected ride before confirming your booking.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-lime-100 text-lime-700">
                <CheckCircle2 size={24} />
              </span>

              <div>
                <h3 className="font-bold text-gray-950">
                  Check ride status
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Use your dashboard to review your ride's
                  available status and booking information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default ServicesSection
