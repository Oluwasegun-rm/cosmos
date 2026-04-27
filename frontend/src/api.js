const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

export async function signup(email, password, displayName) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, display_name: displayName }),
  })
}

export async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout() {
  return request('/api/auth/logout', { method: 'POST' })
}

export async function getCurrentUser() {
  return request('/api/auth/me')
}

export async function fetchEntries(category = null) {
  const url = category ? `/api/entries?category=${category}` : '/api/entries'
  return request(url)
}

export async function fetchEntry(entryId) {
  return request(`/api/entries/${entryId}`)
}

export async function createEntry(entry) {
  return request('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export async function updateEntry(entryId, entry) {
  return request(`/api/entries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(entry),
  })
}

export async function deleteEntry(entryId) {
  return request(`/api/entries/${entryId}`, { method: 'DELETE' })
}

export async function getInsights(entryId) {
  return request(`/api/entries/${entryId}/insights`)
}

export async function generateInsights(entryId) {
  return request(`/api/entries/${entryId}/insights`, { method: 'POST' })
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...JSON_HEADERS,
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed with ${response.status}`)
  }

  return payload
}
