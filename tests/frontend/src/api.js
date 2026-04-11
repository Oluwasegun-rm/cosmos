const JSON_HEADERS = {
  'Content-Type': 'application/json',
}

export async function fetchEntries() {
  return request('/api/entries')
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

export async function fetchInsights(entryId) {
  return request(`/api/entries/${entryId}/insights`)
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
  return request(`/api/entries/${entryId}`, { method: 'DELETE' })
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
