
const API_URL = 'http://10.71.144.216:5000/api/auth'

async function sendAuthRequest(endpoint, data) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Something went wrong')
  }

  return result
}

export function registerUser(data) {
  return sendAuthRequest('register', data)
}

export function loginUser(data) {
  return sendAuthRequest('login', data)
}
