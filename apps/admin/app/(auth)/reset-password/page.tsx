'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { post } from '../../../lib/api-client'

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
      setServerError('Invalid reset link.')
      return
    }
    try {
      await post('/auth/admin/reset-password', { token, password: data.password })
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Reset failed. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-4 text-4xl text-[#C9A96E]">✓</div>
        <h1 className="text-xl font-medium text-white">Password reset</h1>
        <p className="mt-3 text-sm text-[#888]">Your password has been updated. Redirecting...</p>
        <Link href="/login" className="mt-8 inline-block text-xs text-[#C9A96E] uppercase hover:underline">
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-xl font-medium text-white">Reset password</h1>
        <p className="mt-1 text-sm text-[#888]">Choose a new password.</p>
      </div>

      {serverError && (
        <div className="mb-6 rounded-sm border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {[
          { id: 'password' as const, label: 'New Password', autoComplete: 'new-password' },
          { id: 'confirmPassword' as const, label: 'Confirm Password', autoComplete: 'new-password' },
        ].map(({ id, label, autoComplete }) => (
          <div key={id} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-xs font-medium tracking-wide text-[#999] uppercase">
              {label}
            </label>
            <input
              id={id}
              type="password"
              autoComplete={autoComplete}
              placeholder="••••••••"
              aria-invalid={!!errors[id]}
              className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-white placeholder:text-[#555] bg-[#1A1A1A] outline-none transition-colors focus:ring-1 ${errors[id] ? 'border-red-600 focus:border-red-600 focus:ring-red-600/20' : 'border-[#333] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
              {...register(id)}
            />
            {errors[id] && <p className="text-xs text-red-400">{errors[id]?.message}</p>}
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-sm bg-[#C9A96E] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </>
  )
}

export default function AdminResetPasswordPage() {
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
        <Suspense fallback={<p className="text-sm text-[#888]">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
