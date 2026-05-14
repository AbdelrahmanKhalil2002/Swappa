'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { post, setToken, clearToken, getToken } from '../lib/api-client'

interface SupplierUser { id: string; name: string; contactEmail: string }

interface AuthCtx {
  supplier: SupplierUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [supplier, setSupplier] = useState<SupplierUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    post<{ accessToken: string; supplier: SupplierUser }>('/auth/supplier/refresh')
      .then((r) => { setToken(r.accessToken); setSupplier(r.supplier) })
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const r = await post<{ accessToken: string; supplier: SupplierUser }>('/auth/supplier/login', { email, password })
    setToken(r.accessToken)
    setSupplier(r.supplier)
    router.replace('/dashboard')
  }

  function logout() {
    post('/auth/supplier/logout').catch(() => null)
    clearToken(); setSupplier(null); router.replace('/login')
  }

  return <Ctx.Provider value={{ supplier, loading, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
