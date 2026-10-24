
import { useState } from 'react'
import { Link, useNavigate,useLocation } from 'react-router-dom'
import { CarFront } from 'lucide-react'
import { loginUser } from '../services/auth'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginUser({
        email,
        password
      })

      // Save the token for authenticated API requests.
      localStorage.setItem('ridelyToken', result.token)
      localStorage.setItem('ridelyUser', JSON.stringify(result.user))


const role = result.user?.role

const destination = location.state?.from?.pathname

const defaultDestination =
  role === 'driver'
    ? '/driver-dashboard'
    : '/customer-dashboard'

const allowedDestination =
  role === 'driver'
    ? '/driver-dashboard'
    : '/customer-dashboard'

navigate(
  destination === allowedDestination
    ? destination
    : defaultDestination,
  { replace: true }
)

    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-lime-50 px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 shadow-xl sm:p-10">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-lime-300">
            <CarFront size={26} />
          </span>
          <span className="text-2xl font-extrabold">
            Ride<span className="text-lime-600">ly</span>
          </span>
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-950">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Log in to continue your journey.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-950 py-3.5 font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          New to Ridely?{' '}
          <Link to="/signup" className="font-bold text-lime-700">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Login
