import * as React from 'react'
import clsx from 'clsx'

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: string
  required?: boolean
}

export function FormInput({
  label,
  name,
  type = 'text',
  error,
  placeholder,
  required,
  className,
  ...rest
}: FormInputProps) {
  const id = `field-${name}`

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium tracking-wide text-[#4A4540] uppercase"
      >
        {label}
        {required && <span className="ml-0.5 text-[#C9A96E]">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        className={clsx(
          'w-full rounded-sm border px-3.5 py-2.5 text-sm text-[#0F0F0F] placeholder:text-[#B0AAA4]',
          'bg-white outline-none transition-colors',
          'focus:border-[#C9A96E] focus:ring-2 focus:ring-[#C9A96E]/20',
          error
            ? 'border-red-400 focus:border-red-400 focus:ring-red-200/50'
            : 'border-[#E8E2DC]',
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
