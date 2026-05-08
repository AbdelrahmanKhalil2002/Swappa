export const SESSION_KEY = 'ag_access_token'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  emailVerified: boolean
}

export function saveAccessToken(token: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_KEY, token)
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SESSION_KEY)
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_KEY)
}
