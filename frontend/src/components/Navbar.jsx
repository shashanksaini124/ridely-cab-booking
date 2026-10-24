
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CarFront, UserRound, Menu, X } from 'lucide-react'

function Navbar() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const goToSection = (sectionId) => {
    setMenuOpen(false)

    if (window.location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
      return
    }

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleAuthNavigation = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  const navLinks = [
    { label: 'Ride', id: 'book' },
    { label: 'Services', id: 'services' },
    { label: 'Safety', id: 'safety' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 md:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-gray-950"
          onClick={() => setMenuOpen(false)}
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300">
            <CarFront size={25} />
          </span>
          <span>
            Ride<span className="text-lime-600">ly</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSection(item.id)}
              className="text-sm font-semibold text-gray-700 hover:text-lime-700"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-4 sm:flex">
          <button
            type="button"
            onClick={() => handleAuthNavigation('/login')}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            <UserRound size={17} />
            Log in
          </button>

          <button
            type="button"
            onClick={() => handleAuthNavigation('/signup')}
            className="rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
          >
            Sign up
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-xl p-2 hover:bg-gray-100 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-5 py-5 shadow-lg md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goToSection(item.id)}
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-lime-50"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => handleAuthNavigation('/login')}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold"
            >
              Log in
            </button>

            <button
              type="button"
              onClick={() => handleAuthNavigation('/signup')}
              className="rounded-xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Sign up
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
