'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { post } from '../lib/api-client'
import {
  saveAccessToken,
  getAccessToken,
  clearAccessToken,
  type AdminUser,
} from '../lib/auth'

interface AuthResponse {
  accessToken: string
  admin: AdminUser
}

interface AuthContextValue {
  user: AdminUser | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setAuth: (token: string, user: AdminUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setAuth = useCallback((token: string, adminUser: AdminUser) => {
    saveAccessToken(token)
    setAccessToken(token)
    setUser(adminUser)
  }, [])

  const clearAuth = useCallback(() => {
    clearAccessToken()
    setAccessToken(null)
    setUser(null)
  }, [])

  // On mount: restore from sessionStorage, then refresh
  useEffect(() => {
    const storedToken = getAccessToken()

    if (!storedToken) {
      setIsLoading(false)
      return
    }

    post<AuthResponse>('/auth/admin/refresh')
      .then((res) => {
        setAuth(res.accessToken, res.admin)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [setAuth, clearAuth])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await post<AuthResponse>('/auth/admin/login', { email, password })
      setAuth(res.accessToken, res.admin)
    },
    [setAuth],
  )

  const logout = useCallback(async () => {
    try {
      await post('/auth/admin/logout')
    } catch {
      // ignore errors during logout
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, setAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
