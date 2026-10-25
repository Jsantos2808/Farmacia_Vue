import { getToken, clearSession } from './session'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...init, headers })
  if (response.status === 401) {
    clearSession()
  }
  if (!response.ok) {
    let message = `Error ${response.status}`
    const text = await response.text().catch(() => '')
    if (text) {
      try {
        const payload = JSON.parse(text) as { message?: string | string[] }
        if (Array.isArray(payload.message)) message = payload.message.join(', ')
        else if (payload.message) message = payload.message
        else message = text
      } catch {
        message = text
      }
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
