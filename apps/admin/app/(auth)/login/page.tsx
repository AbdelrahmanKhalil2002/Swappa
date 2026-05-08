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
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function AdminLoginPage() {
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
      router.push('/dashboard')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      {/* Brand */}
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-[#C9A96E] uppercase">
          ANTIGRAVITY
        </span>
        <p className="mt-1 text-xs text-[#666]">Admin Panel</p>
      </div>

      {/* Card */}
      <div className="rounded-sm bg-[#242424] border border-[#333] px-8 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-medium text-white">Sign in</h1>
          <p className="mt-1 text-sm text-[#888]">Access the operations panel</p>
        </div>

        {serverError && (
          <div className="mb-6 rounded-sm border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium tracking-wide text-[#999] uppercase">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@antigravity.com"
              aria-invalid={!!errors.email}
              className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-white placeholder:text-[#555] bg-[#1A1A1A] outline-none transition-colors focus:ring-1 ${errors.email ? 'border-red-600 focus:border-red-600 focus:ring-red-600/20' : 'border-[#333] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-medium tracking-wide text-[#999] uppercase">
                Password
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
              className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-white placeholder:text-[#555] bg-[#1A1A1A] outline-none transition-colors focus:ring-1 ${errors.password ? 'border-red-600 focus:border-red-600 focus:ring-red-600/20' : 'border-[#333] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
              {...register('password')}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-sm bg-[#C9A96E] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
