// Cliente de la API de hábitos. Todas las llamadas pasan por request()
// para manejar los errores de la misma forma en toda la aplicación.

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5285').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors // { name: '...', startDate: '...' }
  }
}

// "Name" -> "name", "StartDate" -> "startDate", "$.startDate" -> "startDate"
function normalizeKey(key) {
  const clean = key.replace(/^\$\./, '')
  return clean.charAt(0).toLowerCase() + clean.slice(1)
}

async function request(path, { method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(`No se pudo conectar con la API (${API_URL}). Verifica que esté en ejecución.`)
  }

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const fieldErrors = {}
    if (data?.errors) {
      for (const [key, messages] of Object.entries(data.errors)) {
        fieldErrors[normalizeKey(key)] = [].concat(messages).join(' ')
      }
    }
    const message =
      data?.detail ||
      (Object.keys(fieldErrors).length > 0 ? 'Revisa los datos del formulario.' : null) ||
      data?.title ||
      `La API respondió con un error (${response.status}).`
    throw new ApiError(message, response.status, fieldErrors)
  }

  return data
}

export const habitsApi = {
  getAll: () => request('/api/habits'),
  create: (habit) => request('/api/habits', { method: 'POST', body: habit }),
  update: (id, habit) => request(`/api/habits/${id}`, { method: 'PUT', body: habit }),
  remove: (id) => request(`/api/habits/${id}`, { method: 'DELETE' }),
  getCompletions: (id) => request(`/api/habits/${id}/completions`),
  markDay: (id, date) => request(`/api/habits/${id}/completions/${date}`, { method: 'PUT' }),
  unmarkDay: (id, date) => request(`/api/habits/${id}/completions/${date}`, { method: 'DELETE' }),
}
