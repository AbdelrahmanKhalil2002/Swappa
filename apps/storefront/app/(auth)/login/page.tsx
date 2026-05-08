'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../../context/auth-context'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      await login(data.email, data.password)
      router.push('/')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

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
          <div className="mb-8">
            <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Welcome back</h1>
            <p className="mt-1.5 text-sm text-[#8A8480]">Sign in to your account</p>
          </div>

          {serverError && (
            <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            {/* Email */}
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

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium tracking-wide text-[#4A4540] uppercase">
                  Password <span className="text-[#C9A96E]">*</span>
                </label>
                <Link href="/forgot-password" className="text-xs text-[#C9A96E] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#B0AAA4] bg-white outline-none transition-colors focus:ring-2 ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : 'border-[#E8E2DC] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-sm bg-[#0F0F0F] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-[#8A8480]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#C9A96E] hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
