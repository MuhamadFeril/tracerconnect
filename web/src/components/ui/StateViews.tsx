import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import { Button } from './Button'

/** Branded loading spinner with animated pulsing dots. */
export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      {/* Logo tile + animated ring */}
      <div className="relative size-14">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 shadow-lg shadow-indigo-600/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-extrabold text-white">TC</span>
        </div>
        {/* Spinning ring around the logo */}
        <svg className="absolute -inset-1 size-[calc(100%+8px)] animate-spin" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="120 60"
            className="text-indigo-300"
          />
        </svg>
      </div>
      {/* Three pulsing dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-indigo-400"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-rose-50">
        <AlertCircle className="size-5 text-rose-600" />
      </div>
      <p className="text-sm text-slate-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title = 'Tidak ada data',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-slate-100">
        <Inbox className="size-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
