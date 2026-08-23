import { AlertCircle, Inbox } from 'lucide-react'
import { Button } from './Button'

/** Branded loading spinner with animated pulsing dots. */
export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      {/* Logo tile + animated ring */}
      <div className="relative size-14">
        <div className="absolute inset-0 rounded-2xl bg-white shadow-lg shadow-indigo-600/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="size-7 text-indigo-800" aria-hidden="true">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="currentColor" />
          </svg>
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

/**
 * Playful "lagging" loader that mimics a slow / stuttering connection:
 * an erratic buffering bar that snaps forward then stalls, plus a jittering
 * spinner and a blinking status text. Use it for intentionally retro / funny
 * loading states (e.g. a fake "nyambung ke server…" moment).
 */
export function LagLoader({ label = 'Menyambungkan ke server…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      {/* Jittering logo tile */}
      <div className="relative size-14 animate-lag-jitter">
        <div className="absolute inset-0 rounded-2xl bg-white shadow-lg shadow-indigo-600/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="size-7 text-indigo-800" aria-hidden="true">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="currentColor" />
          </svg>
        </div>
        {/* Partial ring that only ever completes in snaps */}
        <svg className="absolute -inset-1 size-[calc(100%+8px)] animate-spin" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="40 200"
            className="text-indigo-300"
          />
        </svg>
      </div>

      {/* Erratic buffering bar */}
      <div className="w-56">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 animate-lag-fill" />
        </div>
      </div>

      <p className="text-sm font-medium text-slate-500">
        {label}
        <span className="animate-lag-blink">…</span>
      </p>
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
