'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'

const inputCls = 'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try { await login(email, password) }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-sm bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent mb-1">Swappa</p>
          <h1 className="text-xl font-semibold">Supplier Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to view your purchase orders</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address" required className={inputCls} autoFocus />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required className={inputCls} />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-foreground text-background font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          First time?{' '}
          <Link href="/accept-invite" className="text-accent hover:underline">Use your invite link</Link>
        </p>
      </div>
    </main>
  )
}
