'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { post } from '../../../lib/api-client'
import { useAuth } from '../../../context/auth-context'
import type { AuthUser } from '../../../lib/auth'

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

interface RegisterResponse {
  accessToken: string
  customer: AuthUser
}

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    try {
      const { confirmPassword: _, ...dto } = data
      void _
      const res = await post<RegisterResponse>('/auth/customer/register', dto)
      setAuth(res.accessToken, res.customer)
      router.push('/')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    }
  }

  const fields: Array<{
    id: keyof FormValues
    label: string
    type?: string
    autoComplete?: string
    placeholder?: string
  }> = [
    { id: 'firstName', label: 'First Name', autoComplete: 'given-name', placeholder: 'Jane' },
    { id: 'lastName', label: 'Last Name', autoComplete: 'family-name', placeholder: 'Doe' },
    { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
    { id: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
    { id: 'confirmPassword', label: 'Confirm Password', type: 'password', autoComplete: 'new-password', placeholder: '••••••••' },
  ]

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
            <h1 className="font-display text-2xl font-light text-[#0F0F0F]">Create an account</h1>
            <p className="mt-1.5 text-sm text-[#8A8480]">Join Swappa today</p>
          </div>

          {serverError && (
            <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            {fields.map(({ id, label, type = 'text', autoComplete, placeholder }) => (
              <div key={id} className="flex flex-col gap-1.5">
                <label
                  htmlFor={id}
                  className="text-xs font-medium tracking-wide text-[#4A4540] uppercase"
                >
                  {label} <span className="text-[#C9A96E]">*</span>
                </label>
                <input
                  id={id}
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  aria-invalid={!!errors[id]}
                  className={`w-full rounded-sm border px-3.5 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#B0AAA4] bg-white outline-none transition-colors focus:ring-2 ${errors[id] ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50' : 'border-[#E8E2DC] focus:border-[#C9A96E] focus:ring-[#C9A96E]/20'}`}
                  {...register(id)}
                />
                {errors[id] && (
                  <p className="text-xs text-red-500">{errors[id]?.message}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-sm bg-[#0F0F0F] px-4 py-3 text-xs font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-[#8A8480]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#C9A96E] hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
