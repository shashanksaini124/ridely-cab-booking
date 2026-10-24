
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

function ProtectedRoute({ requiredRole }) {
  const location = useLocation()
  const token = localStorage.getItem('ridelyToken')

  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true

    async function verifyUser() {
      if (!token) {
        setStatus('unauthenticated')
        return
      }

      try {
        const response = await fetch('http://10.71.144.216:5000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          localStorage.removeItem('ridelyToken')
          localStorage.removeItem('ridelyUser')

          if (active) setStatus('unauthenticated')
          return
        }

        const data = await response.json()

        if (!active) return

        if (requiredRole && data.role !== requiredRole) {
          setStatus('forbidden')
          return
        }

        setStatus('authorized')
      } catch (error) {
        if (active) setStatus('error')
      }
    }

    verifyUser()

    return () => {
      active = false
    }
  }, [token, requiredRole])

  if (status === 'loading') {
    return <div className="p-6">Verifying access...</div>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (status === 'forbidden') {
    return <Navigate to="/customer-dashboard" replace />
  }

  if (status === 'error') {
    return <div className="p-6">Unable to verify login. Please refresh and try again.</div>
  }

  return <Outlet />
}

export default ProtectedRoute
