import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import { Button } from './Button'

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Loader2 className="size-7 animate-spin" />
      <p className="text-sm">{label}</p>
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
