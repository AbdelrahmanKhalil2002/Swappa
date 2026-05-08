import * as React from 'react'

export interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
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
          {/* Title + subtitle */}
          <div className="mb-8">
            <h1 className="font-display text-2xl font-light text-[#0F0F0F]">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-[#8A8480]">{subtitle}</p>
            )}
          </div>

          {/* Form content */}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 text-center text-sm text-[#8A8480]">{footer}</div>
        )}
      </div>
    </div>
  )
}
