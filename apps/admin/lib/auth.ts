export const SESSION_KEY = 'ag_admin_token'

export interface AdminPermission {
  module: string
  action: string
}

export interface AdminRole {
  name: string
  permissions: AdminPermission[]
}

export interface AdminUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: AdminRole
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
