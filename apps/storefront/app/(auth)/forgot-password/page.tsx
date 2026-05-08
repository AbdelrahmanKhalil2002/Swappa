'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { post } from '../../../lib/api-client'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      await post('/auth/customer/forgot-password', { email: data.email })
      setSuccess(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F2EE] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="font-display text-xs font-semibold tracking-[0.25em] text-[#0F0F0F] uppercase">
            ANTIGRAVITY
          </span>
        </div>

        {/* Card */}
        <div className="rounded-sm bg-white px-8 py-10 shadow-sm">
          {success ? (
            <div className="text-center">
              <div className="mb-4 text-3xl">✉</div>
              <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Check your email</h1>
              <p className="mt-3 text-sm text-[#8A8480] leading-relaxed">
                If an account exists for that email address, a reset link has been sent.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-block text-xs font-semibold tracking-[0.1em] text-[#C9A96E] uppercase hover:underline"
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Forgot password?</h1>
                <p className="mt-1.5 text-sm text-[#8A8480]">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {serverError && (
                <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-xs font-medium tracking-wide text-[#4A4540] uppercase">
                    Email <span className="text-[#C9A96E]">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#B0AAA4] bg-white outline-none transition-colors focus:ring-2 ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : 'border-[#E8E2DC] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-sm bg-[#0F0F0F] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        {!success && (
          <div className="mt-6 text-center text-sm text-[#8A8480]">
            <Link href="/login" className="text-[#C9A96E] hover:underline">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
