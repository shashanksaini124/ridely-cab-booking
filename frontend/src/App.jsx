
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CustomerDashboard from './pages/CustomerDashboard'
import DriverDashboard from './pages/DriverDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

      
{/* Protected customer routes */}
<Route element={<ProtectedRoute requiredRole="customer" />}>
  <Route
    path="/customer-dashboard"
    element={<CustomerDashboard />}
  />
</Route>

{/* Protected driver routes */}
<Route element={<ProtectedRoute requiredRole="driver" />}>
  <Route
    path="/driver-dashboard"
    element={<DriverDashboard />}
  />
</Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App
