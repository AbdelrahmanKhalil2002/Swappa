'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { post, setToken, clearToken, getToken } from '../lib/api-client'

interface Worker {
  id: string
  name: string
}

interface AuthContextValue {
  worker: Worker | null
  loading: boolean
  login: (workerId: string, pin: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [worker, setWorker] = useState<Worker | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session from stored token (best effort)
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    // Try refreshing the token to validate the session
    post<{ accessToken: string; worker: Worker }>('/auth/factory/refresh')
      .then((res) => {
        setToken(res.accessToken)
        setWorker(res.worker)
      })
      .catch(() => {
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(workerId: string, pin: string) {
    const res = await post<{ accessToken: string; worker: Worker }>('/auth/factory/login', {
      workerId,
      pin,
    })
    setToken(res.accessToken)
    setWorker(res.worker)
    router.replace('/dashboard')
  }

  function logout() {
    post('/auth/factory/logout').catch(() => null)
    clearToken()
    setWorker(null)
    router.replace('/login')
  }

  return (
    <AuthContext.Provider value={{ worker, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
