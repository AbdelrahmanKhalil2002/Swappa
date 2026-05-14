const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TOKEN_KEY = 'ag_supplier_token'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message); this.name = 'ApiError'
  }
}

export function getToken() { return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

function authHeaders() {
  const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers },
  })

  if (!res.ok) {
    let msg = `Request failed ${res.status}`
    try {
      const b = await res.json()
      if (b?.message) msg = Array.isArray(b.message) ? b.message.join(', ') : b.message
    } catch { /* ignore */ }
    throw new ApiError(msg, res.status)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export const get = <T>(path: string, opts?: RequestInit) => apiRequest<T>(path, { ...opts, method: 'GET' })
export const post = <T>(path: string, body?: unknown, opts?: RequestInit) =>
  apiRequest<T>(path, { ...opts, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined })
export const patch = <T>(path: string, body?: unknown, opts?: RequestInit) =>
  apiRequest<T>(path, { ...opts, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined })
