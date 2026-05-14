'use client'

import { useState } from 'react'
import { Delete } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']
const PIN_LENGTH = 6

export default function LoginPage() {
  const { login } = useAuth()
  const [workerId, setWorkerId] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'worker' | 'pin'>('worker')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handlePinKey(key: string) {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (pin.length >= PIN_LENGTH) return
    setPin((p) => p + key)
  }

  async function handleSubmit() {
    if (pin.length !== PIN_LENGTH) return
    setLoading(true)
    setError('')
    try {
      await login(workerId.trim(), pin)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials')
      setPin('')
      setLoading(false)
    }
  }

  if (step === 'worker') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Swappa Factory</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your worker ID to continue</p>
          </div>

          <div className="space-y-3">
            <input
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              placeholder="Worker ID"
              className="w-full px-4 py-3 bg-surface border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <button
              onClick={() => { setError(''); setStep('pin') }}
              disabled={!workerId.trim()}
              className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-xl disabled:opacity-40 transition-colors hover:opacity-90"
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Enter PIN</h1>
          <p className="text-sm text-muted-foreground mt-1">{workerId}</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? 'bg-accent border-accent'
                  : 'border-muted-foreground'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        {/* PIN pad */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, i) => {
            if (key === '') return <div key={i} />
            if (key === 'del') {
              return (
                <button
                  key={i}
                  onClick={() => handlePinKey('del')}
                  className="flex items-center justify-center h-16 rounded-2xl bg-surface hover:bg-muted transition-colors active:scale-95"
                >
                  <Delete className="w-5 h-5 text-muted-foreground" />
                </button>
              )
            }
            return (
              <button
                key={i}
                onClick={() => handlePinKey(key)}
                className="flex items-center justify-center h-16 rounded-2xl bg-surface hover:bg-muted transition-colors active:scale-95 text-xl font-medium"
              >
                {key}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={pin.length !== PIN_LENGTH || loading}
            className="w-full py-3 bg-accent text-accent-foreground font-semibold rounded-xl disabled:opacity-40 transition-colors hover:opacity-90"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            onClick={() => { setStep('worker'); setPin('') }}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </main>
  )
}
