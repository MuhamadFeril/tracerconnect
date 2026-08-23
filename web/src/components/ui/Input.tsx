import { forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, disabled, required, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        className={clsx(
          'w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-slate-400',
          'focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
          error ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-200' : 'border-slate-200',
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${props.id}-error`} className="mt-1.5 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
)
Input.displayName = 'Input'