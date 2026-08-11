import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  toast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur',
              t.type === 'success'
                ? 'border-emerald-200 bg-white/95 text-emerald-800'
                : 'border-rose-200 bg-white/95 text-rose-800',
            )}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="size-4.5 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="size-4.5 shrink-0 text-rose-500" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue['toast'] {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus digunakan di dalam ToastProvider')
  return ctx.toast
}
