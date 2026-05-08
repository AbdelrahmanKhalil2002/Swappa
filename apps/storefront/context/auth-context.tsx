'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { post } from '../lib/api-client'
import {
  saveAccessToken,
  getAccessToken,
  clearAccessToken,
  type AuthUser,
} from '../lib/auth'

interface RegisterDto {
  firstName: string
  lastName: string
  email: string
  password: string
}

interface AuthResponse {
  accessToken: string
  customer: AuthUser
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (dto: RegisterDto) => Promise<void>
  logout: () => Promise<void>
  setAuth: (token: string, user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setAuth = useCallback((token: string, authUser: AuthUser) => {
    saveAccessToken(token)
    setAccessToken(token)
    setUser(authUser)
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

    // Try refresh to get a fresh token + validate session
    post<AuthResponse>('/auth/customer/refresh')
      .then((res) => {
        setAuth(res.accessToken, res.customer)
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
      const res = await post<AuthResponse>('/auth/customer/login', { email, password })
      setAuth(res.accessToken, res.customer)
    },
    [setAuth],
  )

  const register = useCallback(
    async (dto: RegisterDto) => {
      const res = await post<AuthResponse>('/auth/customer/register', dto)
      setAuth(res.accessToken, res.customer)
    },
    [setAuth],
  )

  const logout = useCallback(async () => {
    try {
      await post('/auth/customer/logout')
    } catch {
      // ignore errors during logout
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, register, logout, setAuth }}>
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
