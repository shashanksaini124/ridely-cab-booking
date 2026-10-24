
import { CarFront, ArrowUpRight } from 'lucide-react'

function Footer() {
  return (
    <footer className="bg-gray-950 px-5 py-10 text-white sm:px-8 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="/"
            className="inline-flex w-fit items-center gap-3 text-2xl font-extrabold tracking-tight"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime-300 text-gray-950">
              <CarFront size={25} />
            </span>

            <span>
              Ride<span className="text-lime-400">ly</span>
            </span>
          </a>

          <a
            href="#book"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/20"
          >
            Book your next ride
            <ArrowUpRight size={17} />
          </a>
        </div>

        <div className="my-8 border-t border-white/15" />

        <div className="flex flex-col gap-3 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Your journey starts here.</p>
          <p>© {new Date().getFullYear()} Ridely. Demo project.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
