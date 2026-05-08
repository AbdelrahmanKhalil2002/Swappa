'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { post } from '../../../lib/api-client'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (!token) {
      setStatus('error')
      setErrorMessage('Invalid verification link.')
      return
    }

    post('/auth/customer/verify-email', { token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Verification failed.')
      })
  }, [token])

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#C9A96E] border-t-transparent" />
        <p className="mt-4 text-sm text-[#8A8480]">Verifying your email...</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="mb-4 text-4xl text-[#C9A96E]">✓</div>
        <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Email verified</h1>
        <p className="mt-3 text-sm text-[#8A8480]">
          Your email has been verified. You can now log in to your account.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-sm bg-[#C9A96E] px-6 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase hover:opacity-90 transition-opacity"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mb-4 text-4xl text-red-400">✕</div>
      <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Verification failed</h1>
      <p className="mt-3 text-sm text-[#8A8480]">
        {errorMessage ?? 'This link may have expired or already been used.'}
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block text-xs font-semibold tracking-[0.1em] text-[#C9A96E] uppercase hover:underline"
      >
        Back to Login
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F2EE] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="font-display text-xs font-semibold tracking-[0.25em] text-[#0F0F0F] uppercase">
            SWAPPA
          </span>
        </div>

        {/* Card */}
        <div className="rounded-sm bg-white px-8 py-10 shadow-sm">
          <Suspense fallback={<p className="text-center text-sm text-[#8A8480]">Loading...</p>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
