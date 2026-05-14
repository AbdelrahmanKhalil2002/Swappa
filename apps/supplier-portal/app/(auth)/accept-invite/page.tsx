'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { get, post, setToken } from '../../../lib/api-client'

const inputCls = 'w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white'

function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [info, setInfo] = useState<{ name: string; email: string } | null>(null)
  const [tokenError, setTokenError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setTokenError('No invite token found in URL.'); return }
    get<{ name: string; email: string }>(`/auth/supplier/invite?token=${token}`)
      .then(setInfo)
      .catch(() => setTokenError('This invite link is invalid or has expired.'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const r = await post<{ accessToken: string }>('/auth/supplier/accept-invite', { token, password })
      setToken(r.accessToken)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setLoading(false)
    }
  }

  if (tokenError) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-surface">
        <div className="w-full max-w-sm bg-white border rounded-2xl shadow-sm p-8 text-center space-y-4">
          <p className="text-sm text-red-500">{tokenError}</p>
          <p className="text-xs text-muted-foreground">Contact your Swappa account manager for a new link.</p>
        </div>
      </main>
    )
  }

  if (!info) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-sm bg-white border rounded-2xl shadow-sm p-8 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent mb-1">Swappa</p>
          <h1 className="text-xl font-semibold">Set your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, <strong>{info.name}</strong>. Set a password to activate your portal access.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          {info.email}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 chars)" required minLength={8} className={inputCls} autoFocus />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password" required className={inputCls} />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-foreground text-background font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Activating…' : 'Activate account'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function AcceptInvitePage() {
  return <Suspense><AcceptInviteForm /></Suspense>
}
