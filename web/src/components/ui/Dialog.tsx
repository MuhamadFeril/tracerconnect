'use client'

import { forwardRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { createPortal } from 'react-dom'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onOpenChange, children }, ref) => {
    if (!open) return null

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onOpenChange(false)
    }

    return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
        <div
          ref={ref}
          className="relative w-full max-w-lg rounded-xl bg-white shadow-xl animate-fade-in-up"
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>,
      document.body
    )
  }
)
Dialog.displayName = 'Dialog'

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={clsx('p-6', className)} {...props}>
      {children}
    </div>
  )
)
DialogContent.displayName = 'DialogContent'

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  )
)
DialogHeader.displayName = 'DialogHeader'

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h2 ref={ref} className={clsx('text-lg font-semibold text-slate-900', className)} {...props}>
      {children}
    </h2>
  )
)
DialogTitle.displayName = 'DialogTitle'

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={clsx('mt-1 text-sm text-slate-500', className)} {...props}>
      {children}
    </p>
  )
)
DialogDescription.displayName = 'DialogDescription'

export function DialogClose({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600',
        className
      )}
      {...props}
    >
      <X className="size-5" />
    </button>
  )
}