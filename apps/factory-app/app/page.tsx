'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/auth-context'

export default function RootPage() {
  const { worker, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(worker ? '/dashboard' : '/login')
  }, [worker, loading, router])

  return null
}
