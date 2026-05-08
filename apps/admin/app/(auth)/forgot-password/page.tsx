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

export default function AdminForgotPasswordPage() {
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
      await post('/auth/admin/forgot-password', { email: data.email })
      setSuccess(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-[#C9A96E] uppercase">
          SWAPPA
        </span>
        <p className="mt-1 text-xs text-[#666]">Admin Panel</p>
      </div>

      {/* Card */}
      <div className="rounded-sm bg-[#242424] border border-[#333] px-8 py-10">
        {success ? (
          <div className="text-center">
            <div className="mb-4 text-3xl text-[#C9A96E]">✉</div>
            <h1 className="text-xl font-medium text-white">Check your email</h1>
            <p className="mt-3 text-sm text-[#888] leading-relaxed">
              If an account exists for that email, a reset link has been sent.
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
              <h1 className="text-xl font-medium text-white">Forgot password?</h1>
              <p className="mt-1 text-sm text-[#888]">
                Enter your email and we&apos;ll send a reset link.
              </p>
            </div>

            {serverError && (
              <div className="mb-6 rounded-sm border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-medium tracking-wide text-[#999] uppercase">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@swappa.com"
                  aria-invalid={!!errors.email}
                  className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-white placeholder:text-[#555] bg-[#1A1A1A] outline-none transition-colors focus:ring-1 ${errors.email ? 'border-red-600 focus:border-red-600 focus:ring-red-600/20' : 'border-[#333] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-sm bg-[#C9A96E] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>

      {!success && (
        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-[#666] hover:text-[#C9A96E]">
            Back to Login
          </Link>
        </div>
      )}
    </div>
  )
}
