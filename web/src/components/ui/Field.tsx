import clsx from 'clsx'
import { forwardRef } from 'react'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

const FIELD_BASE =
  'w-full rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400'

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={clsx(FIELD_BASE, 'h-10 px-3', invalid ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-500', className)}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(FIELD_BASE, 'px-3 py-2', invalid ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-500', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <select
    ref={ref}
    className={clsx(FIELD_BASE, 'h-10 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2364748b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22/%3E%3C/svg%3E")] bg-[position:right_0.5rem_center] bg-no-repeat pr-9 pl-3', invalid ? 'border-rose-400' : 'border-slate-300 focus:border-indigo-500', className)}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'
