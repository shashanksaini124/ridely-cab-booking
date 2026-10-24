
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CarFront } from 'lucide-react'
import { registerUser } from '../services/auth'

function Signup() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('customer')
  const [phone, setPhone] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
await registerUser({
  name: name.trim(),
  email: email.trim(),
  phone: phone.trim(),
  password,
  role
})

      navigate('/login', {
        state: { message: 'Account created successfully. Please log in.' }
      })
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
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
          Create your account
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Get started with your next ride.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
            />
          </div>

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
  <label
    htmlFor="phone"
    className="mb-2 block text-sm font-semibold"
  >
    Phone Number
  </label>

  <input
    id="phone"
    name="phone"
    type="tel"
    autoComplete="tel"
    value={phone}
    onChange={(event) => setPhone(event.target.value)}
    placeholder="Enter your phone number"
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
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-lime-500 focus:ring-4 focus:ring-lime-100"
            />
          </div>

          
<div>
  <label className="mb-2 block text-sm font-semibold">
    I want to join Ridely as
  </label>

  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => setRole('customer')}
      className={`rounded-xl border p-4 text-left transition ${
        role === 'customer'
          ? 'border-lime-500 bg-lime-50 ring-2 ring-lime-200'
          : 'border-gray-200 bg-white hover:border-lime-300'
      }`}
    >
      <CarFront size={24} className="mb-2 text-lime-700" />
      <span className="block font-bold text-gray-950">Customer</span>
      <span className="mt-1 block text-xs text-gray-500">
        Book rides
      </span>
    </button>

    <button
      type="button"
      onClick={() => setRole('driver')}
      className={`rounded-xl border p-4 text-left transition ${
        role === 'driver'
          ? 'border-lime-500 bg-lime-50 ring-2 ring-lime-200'
          : 'border-gray-200 bg-white hover:border-lime-300'
      }`}
    >
      <CarFront size={24} className="mb-2 text-lime-700" />
      <span className="block font-bold text-gray-950">Driver</span>
      <span className="mt-1 block text-xs text-gray-500">
        Accept ride requests
      </span>
    </button>
  </div>
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
            className="w-full rounded-xl bg-lime-300 py-3.5 font-bold text-gray-950 hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already registered?{' '}
          <Link to="/login" className="font-bold text-lime-700">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Signup
