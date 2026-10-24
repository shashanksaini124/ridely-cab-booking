
const driverOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Please log in first.'
    })
  }

  if (req.user.role !== 'driver') {
    return res.status(403).json({
      message: 'Access denied. Drivers only.'
    })
  }

  next()
}

export default driverOnly
