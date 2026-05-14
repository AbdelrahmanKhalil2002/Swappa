'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/auth-context'

export default function RootPage() {
  const { supplier, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) router.replace(supplier ? '/dashboard' : '/login')
  }, [supplier, loading, router])

  return null
}
