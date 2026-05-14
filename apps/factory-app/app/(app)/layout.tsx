'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/auth-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { worker, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !worker) {
      router.replace('/login')
    }
  }, [worker, loading, router])

  if (loading || !worker) return null

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-surface border-b px-5 py-4 flex items-center justify-between">
        <div>
          <span className="font-semibold tracking-wide text-foreground">Swappa</span>
          <span className="ml-2 text-xs text-accent font-medium uppercase tracking-wider">Factory</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{worker.name}</span>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
