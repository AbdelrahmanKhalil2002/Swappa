'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { post } from '../../../lib/api-client'
import { Suspense } from 'react'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    if (!token) {
      setServerError('Invalid reset link. Please request a new one.')
      return
    }
    try {
      await post('/auth/customer/reset-password', { token, password: data.password })
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Reset failed. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-4 text-3xl">✓</div>
        <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Password reset</h1>
        <p className="mt-3 text-sm text-[#8A8480] leading-relaxed">
          Your password has been updated. Redirecting you to login...
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-xs font-semibold tracking-[0.1em] text-[#C9A96E] uppercase hover:underline"
        >
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Reset password</h1>
        <p className="mt-1.5 text-sm text-[#8A8480]">Choose a new password for your account.</p>
      </div>

      {serverError && (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-medium tracking-wide text-[#4A4540] uppercase">
            New Password <span className="text-[#C9A96E]">*</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#B0AAA4] bg-white outline-none transition-colors focus:ring-2 ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : 'border-[#E8E2DC] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-xs font-medium tracking-wide text-[#4A4540] uppercase">
            Confirm Password <span className="text-[#C9A96E]">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!errors.confirmPassword}
            className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#B0AAA4] bg-white outline-none transition-colors focus:ring-2 ${errors.confirmPassword ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : 'border-[#E8E2DC] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-sm bg-[#0F0F0F] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
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
          <Suspense fallback={<p className="text-sm text-[#8A8480]">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
