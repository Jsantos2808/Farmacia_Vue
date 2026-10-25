export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'cashier'
}

const TOKEN_KEY = 'farmacia.token'
const USER_KEY = 'farmacia.user'

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null
}

export function getUser(): SessionUser | null {
  const raw = storage()?.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function saveSession(token: string, user: SessionUser): void {
  const store = storage()
  if (!store) return
  store.setItem(TOKEN_KEY, token)
  store.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  const store = storage()
  if (!store) return
  store.removeItem(TOKEN_KEY)
  store.removeItem(USER_KEY)
}
